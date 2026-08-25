import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDb } from '../db/schema.js';
import {
  generateMonthlySnapshots,
  getProjections,
  getKhLiquidity,
  recalculateFromManualBalance,
} from '../pension/calculator.js';

const router = Router();

const ProfileSchema = z.object({
  display_name: z.string(),
  gross_salary: z.number().positive(),
  salary_effective_date: z.string(),
  kh_employer_pct: z.number().default(7.5),
  kh_employee_pct: z.number().default(2.5),
  kh_ceiling: z.number().default(15712),
  kh_start_date: z.string(),
  kh_current_balance: z.number().default(0),
  kh_last_manual_balance_date: z.string().nullable().optional(),
  pension_employer_pct: z.number().default(6.5),
  pension_employee_pct: z.number().default(6.0),
  pension_employer_compensation_pct: z.number().default(8.33),
  pension_ceiling: z.number().default(47465),
  pension_start_date: z.string(),
  pension_current_balance: z.number().default(0),
  pension_last_manual_balance_date: z.string().nullable().optional(),
  disability_pct: z.number().default(2.5),
});

router.get('/profiles', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM pension_profiles ORDER BY created_at DESC').all();
  res.json({ success: true, data: rows });
});

router.post('/profiles', (req: Request, res: Response) => {
  const parse = ProfileSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parse.error.message } });
    return;
  }
  const id = uuidv4();
  const d = parse.data;
  const db = getDb();
  db.prepare(
    `INSERT INTO pension_profiles
      (id, display_name, gross_salary, salary_effective_date,
       kh_employer_pct, kh_employee_pct, kh_ceiling, kh_start_date,
       kh_current_balance, kh_last_manual_balance_date,
       pension_employer_pct, pension_employee_pct, pension_employer_compensation_pct,
       pension_ceiling, pension_start_date, pension_current_balance,
       pension_last_manual_balance_date, disability_pct)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id, d.display_name, d.gross_salary, d.salary_effective_date,
    d.kh_employer_pct, d.kh_employee_pct, d.kh_ceiling, d.kh_start_date,
    d.kh_current_balance, d.kh_last_manual_balance_date ?? null,
    d.pension_employer_pct, d.pension_employee_pct, d.pension_employer_compensation_pct,
    d.pension_ceiling, d.pension_start_date, d.pension_current_balance,
    d.pension_last_manual_balance_date ?? null, d.disability_pct
  );
  res.status(201).json({ success: true, data: { id } });
});

router.put('/profiles/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM pension_profiles WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    return;
  }
  const parse = ProfileSchema.partial().safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parse.error.message } });
    return;
  }
  const fields = Object.entries(parse.data)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`);
  const values = Object.values(parse.data).filter((v) => v !== undefined);
  if (fields.length === 0) { res.json({ success: true }); return; }

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(req.params.id);

  db.prepare(`UPDATE pension_profiles SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

router.delete('/profiles/:id', (req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM pension_profiles WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    return;
  }
  db.prepare('DELETE FROM pension_monthly_snapshots WHERE profile_id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/profiles/:id/snapshots', (req: Request, res: Response) => {
  const { from_year, from_month, to_year, to_month } = req.query as Record<string, string>;
  const now = new Date();
  const fy = parseInt(from_year ?? String(now.getFullYear()), 10);
  const fm = parseInt(from_month ?? '1', 10);
  const ty = parseInt(to_year ?? String(now.getFullYear()), 10);
  const tm = parseInt(to_month ?? String(now.getMonth() + 1), 10);

  try {
    const snapshots = generateMonthlySnapshots(req.params.id, fy, fm, ty, tm);
    res.json({ success: true, data: snapshots });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: { code: 'CALC_ERROR', message } });
  }
});

router.post('/profiles/:id/recalculate', (req: Request, res: Response) => {
  const db = getDb();
  const { manual_kh_balance, manual_pension_balance, as_of_date } = req.body as Record<string, unknown>;

  if (manual_kh_balance !== undefined || manual_pension_balance !== undefined) {
    const updates: string[] = [];
    const vals: unknown[] = [];
    if (manual_kh_balance !== undefined) {
      updates.push('kh_current_balance = ?', 'kh_last_manual_balance_date = ?');
      vals.push(manual_kh_balance, as_of_date ?? new Date().toISOString().slice(0, 10));
    }
    if (manual_pension_balance !== undefined) {
      updates.push('pension_current_balance = ?', 'pension_last_manual_balance_date = ?');
      vals.push(manual_pension_balance, as_of_date ?? new Date().toISOString().slice(0, 10));
    }
    vals.push(req.params.id);
    db.prepare(`UPDATE pension_profiles SET ${updates.join(', ')} WHERE id = ?`).run(...vals);
  }

  try {
    recalculateFromManualBalance(req.params.id);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: { code: 'CALC_ERROR', message } });
  }
});

router.get('/profiles/:id/projections', (req: Request, res: Response) => {
  const yearsAhead = parseInt((req.query.years_ahead as string) ?? '10', 10);
  try {
    const data = getProjections(req.params.id, yearsAhead);
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: { code: 'CALC_ERROR', message } });
  }
});

router.get('/profiles/:id/liquidity', (req: Request, res: Response) => {
  try {
    const data = getKhLiquidity(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message } });
  }
});

export default router;
