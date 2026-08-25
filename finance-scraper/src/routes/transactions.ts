import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const {
    from,
    to,
    institution_id,
    category,
    min_amount,
    max_amount,
    status,
    page = '1',
    per_page = '50',
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const perPage = Math.min(200, Math.max(1, parseInt(per_page, 10)));
  const offset = (pageNum - 1) * perPage;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (from) { conditions.push('date >= ?'); params.push(from); }
  if (to) { conditions.push('date <= ?'); params.push(to); }
  if (institution_id) { conditions.push('institution_id = ?'); params.push(institution_id); }
  if (category) { conditions.push('category = ?'); params.push(category); }
  if (min_amount) { conditions.push('amount >= ?'); params.push(parseFloat(min_amount)); }
  if (max_amount) { conditions.push('amount <= ?'); params.push(parseFloat(max_amount)); }
  if (status) { conditions.push('status = ?'); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM transactions ${where}`).get(...params) as { cnt: number }).cnt;
  const rows = db.prepare(`SELECT * FROM transactions ${where} ORDER BY date DESC LIMIT ? OFFSET ?`).all(...params, perPage, offset);

  res.json({
    success: true,
    data: rows,
    meta: { total, page: pageNum, per_page: perPage },
  });
});

router.get('/summary', (req: Request, res: Response) => {
  const db = getDb();
  const { year, month } = req.query as Record<string, string>;
  if (!year || !month) {
    res.status(400).json({ success: false, error: { code: 'MISSING_PARAMS', message: 'year and month required' } });
    return;
  }

  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const rows = db
    .prepare(
      `SELECT category, SUM(amount) as total, COUNT(*) as count
       FROM transactions WHERE date LIKE ? GROUP BY category ORDER BY total DESC`
    )
    .all(`${prefix}%`);

  const totalExpense = (rows as { total: number }[]).reduce((s, r) => s + r.total, 0);
  res.json({ success: true, data: { year: parseInt(year), month: parseInt(month), total_expense: totalExpense, by_category: rows } });
});

router.get('/search', (req: Request, res: Response) => {
  const db = getDb();
  const q = (req.query.q as string) ?? '';
  if (!q) {
    res.status(400).json({ success: false, error: { code: 'MISSING_PARAMS', message: 'q required' } });
    return;
  }
  const rows = db
    .prepare("SELECT * FROM transactions WHERE description LIKE ? OR memo LIKE ? ORDER BY date DESC LIMIT 100")
    .all(`%${q}%`, `%${q}%`);
  res.json({ success: true, data: rows });
});

export default router;
