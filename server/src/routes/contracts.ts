import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { generateContractAnalysis } from '../ai/service';
import type { Contract, Company, Anomaly } from '../types';

const router = Router();

// GET /contracts?search=&risk=&page=&limit=&sort=
router.get('/', (req: Request, res: Response) => {
  const db     = getDb();
  const search = String(req.query.search || '').trim();
  const risk   = String(req.query.risk   || 'all');
  const page   = Math.max(1, parseInt(String(req.query.page  || '1')));
  const limit  = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'))));
  const sort   = String(req.query.sort   || 'risk_score');
  const dir    = String(req.query.dir    || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const allowed = new Set(['risk_score', 'amount', 'date', 'title']);
  const orderBy = allowed.has(sort) ? `c.${sort}` : 'c.risk_score';

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (search) {
    conditions.push(`(c.title LIKE ? OR co.name LIKE ? OR c.category LIKE ? OR c.region LIKE ?)`);
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  if (risk === 'critical') { conditions.push('c.risk_score >= 80');  }
  else if (risk === 'high')  { conditions.push('c.risk_score >= 60 AND c.risk_score < 80'); }
  else if (risk === 'medium'){ conditions.push('c.risk_score >= 40 AND c.risk_score < 60'); }
  else if (risk === 'low')   { conditions.push('c.risk_score < 40');  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = (db.prepare(`
    SELECT COUNT(*) as cnt FROM contracts c
    JOIN companies co ON c.supplier_id = co.id ${where}
  `).get(...params) as { cnt: number }).cnt;

  const contracts = db.prepare(`
    SELECT c.*, co.name as supplier_name
    FROM contracts c
    JOIN companies co ON c.supplier_id = co.id
    ${where}
    ORDER BY ${orderBy} ${dir}
    LIMIT ? OFFSET ?
  `).all(...params, limit, (page - 1) * limit) as Array<Contract & { supplier_name: string }>;

  res.json({
    data: contracts,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

// GET /contracts/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

  const contract = db.prepare(`
    SELECT c.*, co.name as supplier_name
    FROM contracts c JOIN companies co ON c.supplier_id = co.id
    WHERE c.id = ?
  `).get(id) as (Contract & { supplier_name: string }) | undefined;

  if (!contract) return res.status(404).json({ error: 'Contract not found' });

  const company  = db.prepare('SELECT * FROM companies WHERE id = ?').get(contract.supplier_id) as Company;
  const anomalies = db.prepare('SELECT * FROM anomalies WHERE contract_id = ? ORDER BY severity ASC').all(id) as Anomaly[];

  // Build risk breakdown from stored flags
  const ratio      = contract.market_avg_price > 0 ? contract.amount / contract.market_avg_price : 1;
  const priceScore = ratio >= 3.5 ? 100 : ratio >= 2 ? 70 : ratio >= 1.5 ? 45 : ratio >= 1.2 ? 20 : 0;
  const compScore  = contract.bidder_count <= 1 ? 100 : contract.bidder_count === 2 ? 65 : contract.bidder_count === 3 ? 30 : 0;
  const repScore   = company ? (company.wins_count >= 40 ? 100 : company.wins_count >= 20 ? 80 : company.wins_count >= 10 ? 55 : 20) : 0;
  const hasAff     = anomalies.some(a => a.type === 'affiliation');
  const affScore   = hasAff ? 100 : 0;

  const risk_breakdown = { price_score: priceScore, repeat_score: repScore, affiliation_score: affScore, competition_score: compScore, total: contract.risk_score };
  const ai_analysis    = generateContractAnalysis(db, id);

  res.json({ data: { ...contract, company, anomalies, risk_breakdown, ai_analysis } });
});

// POST /contracts  (add new contract, triggers risk scoring)
router.post('/', (req: Request, res: Response) => {
  const db   = getDb();
  const body = req.body as Partial<Contract>;

  if (!body.title || !body.supplier_id || !body.amount) {
    return res.status(400).json({ error: 'title, supplier_id and amount are required' });
  }

  const company = db.prepare('SELECT wins_count FROM companies WHERE id = ?').get(body.supplier_id) as { wins_count: number } | undefined;
  if (!company) return res.status(400).json({ error: 'Supplier company not found' });

  const total_cat = (db.prepare('SELECT COUNT(*) as cnt FROM contracts WHERE category = ?').get(body.category || '') as { cnt: number }).cnt;
  const rels      = (db.prepare(`SELECT COUNT(*) as cnt FROM relationships WHERE (from_type='company' AND from_id=? AND is_suspicious=1) OR (to_type='company' AND to_id=? AND is_suspicious=1)`).get(body.supplier_id, body.supplier_id) as { cnt: number }).cnt;

  const { calculateRisk } = require('../risk/engine');
  const result = calculateRisk({
    amount:                   body.amount,
    market_avg_price:         body.market_avg_price || body.amount * 0.8,
    bidder_count:             body.bidder_count || 1,
    supplier_wins:            company.wins_count,
    total_category_contracts: Math.max(total_cat + 1, 5),
    has_affiliation:          rels > 0,
  });

  const info = db.prepare(`
    INSERT INTO contracts (title, supplier_id, amount, market_avg_price, category, region, bidder_count, risk_score, risk_flags, status, description, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.title, body.supplier_id, body.amount,
    body.market_avg_price || body.amount * 0.8,
    body.category || '', body.region || '', body.bidder_count || 1,
    result.score, JSON.stringify(result.anomalies.map((a: { title: string }) => a.title)),
    body.status || 'active', body.description || '', body.date || new Date().toISOString().split('T')[0],
  );

  const contractId = info.lastInsertRowid as bigint;
  const insertAnomaly = db.prepare(`INSERT INTO anomalies (contract_id, type, title, description, severity, evidence) VALUES (?, ?, ?, ?, ?, ?)`);
  result.anomalies.forEach((a: Omit<import('../types').Anomaly, 'id' | 'contract_id' | 'detected_at'>) => {
    insertAnomaly.run(contractId, a.type, a.title, a.description, a.severity, a.evidence);
  });

  if (result.score >= 70) {
    db.prepare(`INSERT INTO alerts (type, title, message, severity, entity_type, entity_id, contract_id) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      'high_risk_contract',
      `Новый контракт высокого риска: ${body.title?.substring(0, 50)}`,
      `Система выявила ${result.anomalies.length} аномалий. Риск-скор: ${result.score}/100.`,
      result.score >= 80 ? 'critical' : 'high',
      'contract', contractId, contractId,
    );
  }

  const created = db.prepare('SELECT c.*, co.name as supplier_name FROM contracts c JOIN companies co ON c.supplier_id = co.id WHERE c.id = ?').get(contractId) as Contract;
  res.status(201).json({ data: created });
});

export default router;
