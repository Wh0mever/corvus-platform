import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import type { Alert } from '../types';

const router = Router();

// GET /alerts?severity=&read=
router.get('/', (req: Request, res: Response) => {
  const db       = getDb();
  const severity = String(req.query.severity || 'all');
  const read     = req.query.read;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (severity !== 'all') {
    conditions.push('severity = ?');
    params.push(severity);
  }
  if (read === 'false' || read === '0') {
    conditions.push('is_read = 0');
  } else if (read === 'true' || read === '1') {
    conditions.push('is_read = 1');
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const alerts = db.prepare(`SELECT * FROM alerts ${where} ORDER BY
    CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END ASC,
    created_at DESC LIMIT 50`).all(...params) as Alert[];

  const unread = (db.prepare('SELECT COUNT(*) as cnt FROM alerts WHERE is_read = 0').get() as { cnt: number }).cnt;

  res.json({ data: alerts, total: alerts.length, unread });
});

// PATCH /alerts/:id  — mark as read
router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

  db.prepare('UPDATE alerts SET is_read = 1 WHERE id = ?').run(id);
  res.json({ success: true });
});

// PATCH /alerts/read-all
router.patch('/read-all', (_req: Request, res: Response) => {
  const db = getDb();
  db.prepare('UPDATE alerts SET is_read = 1').run();
  res.json({ success: true });
});

export default router;
