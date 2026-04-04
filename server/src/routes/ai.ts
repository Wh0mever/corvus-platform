import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { handleQuery, generateContractAnalysis } from '../ai/service';

const router = Router();

// POST /ai/query
router.post('/query', (req: Request, res: Response) => {
  const { message } = req.body as { message?: string };
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const db       = getDb();
  const response = handleQuery(db, message.trim());
  res.json({ response });
});

// POST /ai/analyze/:contractId
router.post('/analyze/:contractId', (req: Request, res: Response) => {
  const db = getDb();
  const id = parseInt(req.params.contractId);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid contract ID' });

  const contract = db.prepare('SELECT id FROM contracts WHERE id = ?').get(id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });

  const analysis = generateContractAnalysis(db, id);
  res.json({ analysis });
});

export default router;
