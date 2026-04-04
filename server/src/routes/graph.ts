import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import type { GraphNode, GraphEdge } from '../types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const db      = getDb();
  const riskMin = parseInt(String(req.query.risk_min || '0'));

  const companies = db.prepare(`SELECT id, name, type, risk_score FROM companies WHERE risk_score >= ?`).all(riskMin) as Array<{ id: number; name: string; type: string; risk_score: number }>;
  const people    = db.prepare(`SELECT id, name, role, risk_score FROM people`).all() as Array<{ id: number; name: string; role: string; risk_score: number }>;
  const contracts = db.prepare(`SELECT id, title, risk_score, amount, category FROM contracts WHERE risk_score >= ?`).all(Math.max(riskMin, 50)) as Array<{ id: number; title: string; risk_score: number; amount: number; category: string }>;
  const rels      = db.prepare(`SELECT * FROM relationships`).all() as Array<{ id: number; from_type: string; from_id: number; to_type: string; to_id: number; rel_type: string; strength: number; is_suspicious: number }>;

  const nodes: GraphNode[] = [
    ...companies.map(c => ({
      id:   `company-${c.id}`,
      type: 'company' as const,
      name: c.name,
      risk: c.risk_score,
      meta: { db_id: c.id, entity_type: c.type },
    })),
    ...people.map(p => ({
      id:   `person-${p.id}`,
      type: 'person' as const,
      name: p.name,
      risk: p.risk_score,
      meta: { db_id: p.id, role: p.role },
    })),
    ...contracts.map(c => ({
      id:   `contract-${c.id}`,
      type: 'contract' as const,
      name: c.title.length > 30 ? c.title.substring(0, 30) + '…' : c.title,
      risk: c.risk_score,
      meta: { db_id: c.id, amount: c.amount, category: c.category },
    })),
  ];

  const nodeIds = new Set(nodes.map(n => n.id));

  const edges: GraphEdge[] = rels
    .map(r => ({
      id:           `rel-${r.id}`,
      source:       `${r.from_type}-${r.from_id}`,
      target:       `${r.to_type}-${r.to_id}`,
      type:         r.rel_type,
      strength:     r.strength,
      is_suspicious: r.is_suspicious === 1,
    }))
    .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

  res.json({ nodes, edges });
});

export default router;
