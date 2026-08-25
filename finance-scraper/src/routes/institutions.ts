import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDb } from '../db/schema.js';
import { encrypt } from '../crypto/encryption.js';

const router = Router();

const CreateSchema = z.object({
  company_id: z.string(),
  display_name: z.string(),
  credentials: z.record(z.string()),
});

const UpdateSchema = z.object({
  credentials: z.record(z.string()),
});

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT id, company_id, display_name, is_active, last_scraped_at, created_at FROM institutions ORDER BY created_at DESC'
    )
    .all();
  res.json({ success: true, data: rows });
});

router.post('/', (req: Request, res: Response) => {
  const parse = CreateSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parse.error.message } });
    return;
  }
  const { company_id, display_name, credentials } = parse.data;
  const id = uuidv4();
  const credentials_encrypted = encrypt(JSON.stringify(credentials));

  const db = getDb();
  db.prepare(
    'INSERT INTO institutions (id, company_id, display_name, credentials_encrypted) VALUES (?,?,?,?)'
  ).run(id, company_id, display_name, credentials_encrypted);

  res.status(201).json({ success: true, data: { id, company_id, display_name } });
});

router.put('/:id', (req: Request, res: Response) => {
  const parse = UpdateSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parse.error.message } });
    return;
  }
  const credentials_encrypted = encrypt(JSON.stringify(parse.data.credentials));
  const db = getDb();
  const result = db
    .prepare('UPDATE institutions SET credentials_encrypted = ? WHERE id = ?')
    .run(credentials_encrypted, req.params.id);

  if (result.changes === 0) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    return;
  }
  res.json({ success: true });
});

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM institutions WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    return;
  }
  res.json({ success: true });
});

router.patch('/:id/toggle', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare('SELECT is_active FROM institutions WHERE id = ?').get(req.params.id) as
    | { is_active: number }
    | undefined;
  if (!row) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    return;
  }
  const newState = row.is_active ? 0 : 1;
  db.prepare('UPDATE institutions SET is_active = ? WHERE id = ?').run(newState, req.params.id);
  res.json({ success: true, data: { is_active: newState === 1 } });
});

export default router;
