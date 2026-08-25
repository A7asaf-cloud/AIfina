import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../db/schema.js';
import { scrapeInstitution, continueWithOtp } from '../scrapers/scraper.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

router.post('/:id', async (req: Request, res: Response) => {
  try {
    const result = await scrapeInstitution(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Scrape error', { err });
    res.status(500).json({
      success: false,
      error: { code: 'SCRAPE_FAILED', message, institution_id: req.params.id },
    });
  }
});

router.post('/all', async (_req: Request, res: Response) => {
  const db = getDb();
  const institutions = db.prepare('SELECT id FROM institutions WHERE is_active = 1').all() as { id: string }[];

  res.json({ success: true, data: { queued: institutions.length } });

  // Run sequentially in the background
  (async () => {
    for (const inst of institutions) {
      try {
        await scrapeInstitution(inst.id);
      } catch (err) {
        logger.error(`Background scrape failed for ${inst.id}`, { err });
      }
      await sleep(5000);
    }
  })().catch((err) => logger.error('Background scrape-all error', { err }));
});

router.post('/:id/otp', async (req: Request, res: Response) => {
  const parse = z.object({ sessionId: z.string(), otpCode: z.string() }).safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parse.error.message } });
    return;
  }
  try {
    const result = await continueWithOtp(parse.data.sessionId, parse.data.otpCode);
    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: { code: 'OTP_ERROR', message } });
  }
});

router.get('/logs', (_req: Request, res: Response) => {
  const db = getDb();
  const logs = db
    .prepare('SELECT * FROM scrape_logs ORDER BY started_at DESC LIMIT 100')
    .all();
  res.json({ success: true, data: logs });
});

export default router;
