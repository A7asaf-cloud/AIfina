import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../db/schema.js';
import { categorizeTransactions, generateMonthlyInsight, detectAnomalies } from '../gemini/analyzer.js';

const router = Router();

router.post('/categorize', async (_req: Request, res: Response) => {
  const db = getDb();
  const uncategorized = db
    .prepare("SELECT id, description, amount FROM transactions WHERE category IS NULL LIMIT 200")
    .all() as { id: string; description: string; amount: number }[];

  if (uncategorized.length === 0) {
    res.json({ success: true, data: { categorized: 0 } });
    return;
  }

  try {
    await categorizeTransactions(uncategorized);
    res.json({ success: true, data: { categorized: uncategorized.length } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: { code: 'GEMINI_ERROR', message } });
  }
});

router.post('/monthly', async (req: Request, res: Response) => {
  const parse = z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }).safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parse.error.message } });
    return;
  }
  const { year, month } = parse.data;
  const db = getDb();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const transactions = db
    .prepare("SELECT id, description, amount, category, date FROM transactions WHERE date LIKE ?")
    .all(`${prefix}%`) as { id: string; description: string; amount: number; category?: string; date: string }[];

  try {
    const insight = await generateMonthlyInsight(year, month, transactions);
    res.json({ success: true, data: insight });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: { code: 'GEMINI_ERROR', message } });
  }
});

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM ai_insights ORDER BY created_at DESC LIMIT 50').all();
  res.json({ success: true, data: rows });
});

export default router;
