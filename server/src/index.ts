import express from 'express';
import cors from 'cors';
import path from 'path';
import { getDb, isEmpty } from './db';
import { seed } from './seed';
import contractsRouter from './routes/contracts';
import statsRouter     from './routes/stats';
import graphRouter     from './routes/graph';
import alertsRouter    from './routes/alerts';
import aiRouter        from './routes/ai';

const app        = express();
const PORT       = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const isProd     = process.env.NODE_ENV === 'production';

// ─── Middleware ───────────────────────────────────────────────────────────────
if (!isProd) {
  app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
}
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/contracts', contractsRouter);
app.use('/api/stats',     statsRouter);
app.use('/api/graph',     graphRouter);
app.use('/api/alerts',    alertsRouter);
app.use('/api/ai',        aiRouter);

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
  // Ensure schema + seed
  getDb();
  if (isEmpty()) {
    console.log('📦 Empty database detected. Seeding...');
    seed();
  }

  app.listen(PORT, () => {
    console.log(`\n🔍 CORVUS Server running at http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health\n`);
  });
}

main().catch(console.error);
