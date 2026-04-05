import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

// GET /api/cases
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const cases = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM case_entities WHERE case_id = c.id) as entity_count,
      (SELECT COUNT(*) FROM case_notes WHERE case_id = c.id) as note_count
    FROM cases c ORDER BY c.updated_at DESC
  `).all();
  res.json({ data: cases });
});

// GET /api/cases/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const caseItem = db.prepare('SELECT * FROM cases WHERE id = ?').get(id);
  if (!caseItem) return res.status(404).json({ error: 'Case not found' });
  const entities = db.prepare('SELECT * FROM case_entities WHERE case_id = ? ORDER BY added_at').all(id);
  const notes = db.prepare('SELECT * FROM case_notes WHERE case_id = ? ORDER BY created_at').all(id);
  res.json({ data: { ...caseItem as object, entities, notes } });
});

// POST /api/cases
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { title, description = '', status = 'open', risk_level = 'medium', investigator = 'Аналитик' } = req.body as {
    title?: string; description?: string; status?: string; risk_level?: string; investigator?: string;
  };
  if (!title) return res.status(400).json({ error: 'title required' });
  const info = db.prepare(
    'INSERT INTO cases (title, description, status, risk_level, investigator) VALUES (?,?,?,?,?)'
  ).run(title, description, status, risk_level, investigator);
  const created = db.prepare('SELECT * FROM cases WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ data: created });
});

// PATCH /api/cases/:id
router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const { title, description, status, risk_level } = req.body as Record<string, string>;
  db.prepare(`UPDATE cases SET
    title = COALESCE(?, title), description = COALESCE(?, description),
    status = COALESCE(?, status), risk_level = COALESCE(?, risk_level),
    updated_at = datetime('now') WHERE id = ?`
  ).run(title ?? null, description ?? null, status ?? null, risk_level ?? null, id);
  res.json({ ok: true });
});

// DELETE /api/cases/:id
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  db.prepare('DELETE FROM cases WHERE id = ?').run(id);
  res.json({ ok: true });
});

// POST /api/cases/:id/entities
router.post('/:id/entities', (req: Request, res: Response) => {
  const db = getDb();
  const case_id = parseInt(req.params.id);
  const { entity_type, entity_id, entity_name, note = '' } = req.body as {
    entity_type?: string; entity_id?: number; entity_name?: string; note?: string;
  };
  if (!entity_type || !entity_name) return res.status(400).json({ error: 'entity_type and entity_name required' });
  const info = db.prepare(
    'INSERT INTO case_entities (case_id, entity_type, entity_id, entity_name, note) VALUES (?,?,?,?,?)'
  ).run(case_id, entity_type, entity_id ?? null, entity_name, note);
  res.status(201).json({ data: db.prepare('SELECT * FROM case_entities WHERE id = ?').get(info.lastInsertRowid) });
});

// DELETE /api/cases/:caseId/entities/:entityId
router.delete('/:caseId/entities/:entityId', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM case_entities WHERE id = ? AND case_id = ?')
    .run(parseInt(req.params.entityId), parseInt(req.params.caseId));
  res.json({ ok: true });
});

// POST /api/cases/:id/notes
router.post('/:id/notes', (req: Request, res: Response) => {
  const db = getDb();
  const case_id = parseInt(req.params.id);
  const { content, author = 'Аналитик' } = req.body as { content?: string; author?: string };
  if (!content) return res.status(400).json({ error: 'content required' });
  db.prepare('UPDATE cases SET updated_at = datetime("now") WHERE id = ?').run(case_id);
  const info = db.prepare('INSERT INTO case_notes (case_id, content, author) VALUES (?,?,?)').run(case_id, content, author);
  res.status(201).json({ data: db.prepare('SELECT * FROM case_notes WHERE id = ?').get(info.lastInsertRowid) });
});

export default router;
