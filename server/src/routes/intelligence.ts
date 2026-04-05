import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { getCompanyByInn, searchOrgInfo } from '../services/orginfo';
import { fetchLiveTenders } from '../services/xarid';
import { calculateRisk } from '../risk/engine';

const router = Router();

// GET /api/intelligence/company?q= or ?inn=
router.get('/company', async (req: Request, res: Response) => {
  const q   = String(req.query.q   || '').trim();
  const inn = String(req.query.inn || '').trim();

  if (!q && !inn) return res.status(400).json({ error: 'q or inn required' });

  try {
    let result = null;

    if (inn) {
      result = await getCompanyByInn(inn);
    } else {
      const results = await searchOrgInfo(q);
      result = results[0] ?? null;
    }

    // Also check if company exists in our DB
    const db = getDb();
    const dbCompany = inn
      ? db.prepare('SELECT * FROM companies WHERE inn = ?').get(inn)
      : db.prepare("SELECT * FROM companies WHERE name LIKE ?").get(`%${q}%`);

    res.json({ data: result, db_company: dbCompany ?? null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/intelligence/company/add - Add company from orginfo to our DB
router.post('/company/add', async (req: Request, res: Response) => {
  const db = getDb();
  const { inn, name, region = 'Ташкент', risk_score = 30 } = req.body as {
    inn?: string; name?: string; region?: string; risk_score?: number;
  };
  if (!name) return res.status(400).json({ error: 'name required' });

  // Check if already exists
  const existing = inn
    ? db.prepare('SELECT id FROM companies WHERE inn = ?').get(inn)
    : db.prepare('SELECT id FROM companies WHERE name = ?').get(name);
  if (existing) return res.status(409).json({ error: 'Company already exists', company: existing });

  const info = db.prepare(`
    INSERT INTO companies (name, type, region, inn, risk_score)
    VALUES (?,?,?,?,?)
  `).run(name, 'supplier', region, inn || '', risk_score);

  res.status(201).json({ data: db.prepare('SELECT * FROM companies WHERE id = ?').get(info.lastInsertRowid) });
});

// GET /api/intelligence/tenders
router.get('/tenders', async (_req: Request, res: Response) => {
  try {
    const tenders = await fetchLiveTenders(20);
    res.json({ data: tenders, source: 'xarid.uzex.uz' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/intelligence/import - Import contracts from JSON array
router.post('/import', (req: Request, res: Response) => {
  const db = getDb();
  const { contracts } = req.body as { contracts?: Array<Record<string, unknown>> };
  if (!Array.isArray(contracts) || contracts.length === 0) {
    return res.status(400).json({ error: 'contracts array required' });
  }

  const results = { imported: 0, errors: [] as string[] };
  const insertContract = db.prepare(`
    INSERT INTO contracts (title, supplier_id, amount, market_avg_price, category, region, bidder_count, risk_score, risk_flags, status, description, date)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const importAll = db.transaction(() => {
    for (const c of contracts) {
      try {
        const supplier_id = c.supplier_id as number || 1;
        const amount = Number(c.amount) || 0;
        const market_avg = Number(c.market_avg_price) || amount * 0.8;

        // Auto-calculate risk
        const company = db.prepare('SELECT wins_count FROM companies WHERE id = ?').get(supplier_id) as { wins_count: number } | undefined;
        const riskResult = calculateRisk({
          amount,
          market_avg_price: market_avg,
          bidder_count: Number(c.bidder_count) || 1,
          supplier_wins: company?.wins_count || 0,
          total_category_contracts: 10,
          has_affiliation: false,
        });

        insertContract.run(
          String(c.title || ''), supplier_id, amount, market_avg,
          String(c.category || ''), String(c.region || ''),
          Number(c.bidder_count) || 1, riskResult.score,
          JSON.stringify(riskResult.anomalies.map((a: { title: string }) => a.title)),
          String(c.status || 'active'), String(c.description || ''),
          String(c.date || new Date().toISOString().split('T')[0]),
        );
        results.imported++;
      } catch (e) {
        results.errors.push(String(e));
      }
    }
  });

  importAll();
  res.json(results);
});

// GET /api/intelligence/crosscheck?inn= - Check if company founders appear in multiple companies
router.get('/crosscheck', async (req: Request, res: Response) => {
  const db = getDb();
  const inn = String(req.query.inn || '').trim();
  const name = String(req.query.name || '').trim();

  if (!inn && !name) return res.status(400).json({ error: 'inn or name required' });

  const company = inn
    ? db.prepare('SELECT * FROM companies WHERE inn = ?').get(inn)
    : db.prepare("SELECT * FROM companies WHERE name LIKE ?").get(`%${name}%`);

  if (!company) return res.json({ data: null, message: 'Company not found in CORVUS database' });

  const c = company as { id: number; name: string; wins_count: number; risk_score: number };

  // Find related entities
  const relationships = db.prepare(`
    SELECT r.*,
      CASE r.to_type WHEN 'company' THEN co.name WHEN 'person' THEN p.name END as to_name,
      CASE r.from_type WHEN 'company' THEN co2.name WHEN 'person' THEN p2.name END as from_name
    FROM relationships r
    LEFT JOIN companies co ON r.to_type='company' AND r.to_id=co.id
    LEFT JOIN people p ON r.to_type='person' AND r.to_id=p.id
    LEFT JOIN companies co2 ON r.from_type='company' AND r.from_id=co2.id
    LEFT JOIN people p2 ON r.from_type='person' AND r.from_id=p2.id
    WHERE (r.from_type='company' AND r.from_id=?) OR (r.to_type='company' AND r.to_id=?)
  `).all(c.id, c.id);

  const contracts = db.prepare(`
    SELECT id, title, amount, risk_score, date FROM contracts WHERE supplier_id = ? ORDER BY risk_score DESC
  `).all(c.id);

  res.json({ data: { company, relationships, contracts } });
});

export default router;
