import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { handleQuery, generateContractAnalysis } from '../ai/service';
import { queryWithContext, analyzeContractWithAI } from '../ai/perplexity';

const router = Router();

const hasPerplexity = () => !!process.env.PERPLEXITY_API_KEY;

// POST /api/ai/query
router.post('/query', async (req: Request, res: Response) => {
  const { message } = req.body as { message?: string };
  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const db = getDb();

  try {
    if (hasPerplexity()) {
      const response = await queryWithContext(db, message.trim());
      return res.json({ response, engine: 'perplexity' });
    }
    // Fallback to template engine
    const response = handleQuery(db, message.trim());
    return res.json({ response, engine: 'template' });
  } catch (err) {
    console.error('[AI query error]', err);
    // On Perplexity failure, fall back gracefully
    try {
      const response = handleQuery(db, message.trim());
      return res.json({ response, engine: 'template-fallback' });
    } catch {
      return res.status(500).json({ error: 'AI service unavailable' });
    }
  }
});

// POST /api/ai/analyze/:contractId
router.post('/analyze/:contractId', async (req: Request, res: Response) => {
  const db = getDb();
  const id = parseInt(req.params.contractId);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid contract ID' });

  const contract = db.prepare('SELECT id FROM contracts WHERE id = ?').get(id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });

  try {
    if (hasPerplexity()) {
      const analysis = await analyzeContractWithAI(db, id);
      return res.json({ analysis, engine: 'perplexity' });
    }
    const analysis = generateContractAnalysis(db, id);
    return res.json({ analysis, engine: 'template' });
  } catch (err) {
    console.error('[AI analyze error]', err);
    try {
      const analysis = generateContractAnalysis(db, id);
      return res.json({ analysis, engine: 'template-fallback' });
    } catch {
      return res.status(500).json({ error: 'AI analysis unavailable' });
    }
  }
});

export default router;
