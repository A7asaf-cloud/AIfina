import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import institutionsRouter from './routes/institutions.js';
import scrapeRouter from './routes/scrape.js';
import transactionsRouter from './routes/transactions.js';
import insightsRouter from './routes/insights.js';
import pensionRouter from './routes/pension.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:8000'] }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.json());

app.use('/api', (req, res, next) => {
  if (req.headers['x-internal-key'] !== process.env.INTERNAL_API_KEY) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    return;
  }
  next();
});

app.use('/api/institutions', institutionsRouter);
app.use('/api/scrape', scrapeRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/pension', pensionRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

export default app;
