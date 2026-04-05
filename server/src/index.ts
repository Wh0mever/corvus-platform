import express from 'express';
import cors from 'cors';
import path from 'path';
import { getDb } from './db';
import { seed as seedDatabase } from './seed';
import contractsRouter    from './routes/contracts';
import statsRouter        from './routes/stats';
import graphRouter        from './routes/graph';
import alertsRouter       from './routes/alerts';
import aiRouter           from './routes/ai';
import casesRouter        from './routes/cases';
import intelligenceRouter from './routes/intelligence';

const app        = express();
const PORT       = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const isProd     = process.env.NODE_ENV === 'production';

// ─── Middleware ───────────────────────────────────────────────────────────────
if (!isProd) {
  app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
}
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/contracts',    contractsRouter);
app.use('/api/stats',        statsRouter);
app.use('/api/graph',        graphRouter);
app.use('/api/alerts',       alertsRouter);
app.use('/api/ai',           aiRouter);
app.use('/api/cases',        casesRouter);
app.use('/api/intelligence', intelligenceRouter);

// Seed demo data on demand
app.post('/api/seed', (_req, res) => {
  try {
    const db = getDb();
    const before = (db.prepare('SELECT COUNT(*) as cnt FROM contracts').get() as { cnt: number }).cnt;
    if (before > 0) return res.json({ message: 'Already seeded', contracts: before });
    seedDatabase();
    const after = (db.prepare('SELECT COUNT(*) as cnt FROM contracts').get() as { cnt: number }).cnt;
    res.json({ message: 'Demo data loaded', contracts: after });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  const db       = getDb();
  const contracts = (db.prepare('SELECT COUNT(*) as cnt FROM contracts').get() as { cnt: number }).cnt;
  res.json({ status: 'ok', contracts, uptime: Math.round(process.uptime()) });
});

// ─── Serve React frontend in production ──────────────────────────────────────
if (isProd) {
  const distPath = path.join(process.cwd(), 'client/dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ─── Error handler ───────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function main() {
  // Ensure schema
  getDb();

  app.listen(PORT, () => {
    console.log(`\n🔍 CORVUS Server running at http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health\n`);
  });
}

main().catch(console.error);
