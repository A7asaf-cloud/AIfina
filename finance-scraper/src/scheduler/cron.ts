import cron from 'node-cron';
import { getDb } from '../db/schema.js';
import { scrapeInstitution } from '../scrapers/scraper.service.js';
import { generateMonthlySnapshots } from '../pension/calculator.js';
import { logger } from '../utils/logger.js';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function initScheduler(): void {
  // Daily scrape at 06:00
  cron.schedule('0 6 * * *', async () => {
    logger.info('Scheduled daily scrape starting');
    const db = getDb();
    const institutions = db.prepare('SELECT id FROM institutions WHERE is_active = 1').all() as { id: string }[];

    for (const inst of institutions) {
      try {
        await scrapeInstitution(inst.id);
        logger.info(`Scheduled scrape completed: ${inst.id}`);
      } catch (err) {
        logger.error(`Scheduled scrape failed: ${inst.id}`, { err });
      }
      await sleep(5000);
    }
    logger.info('Scheduled daily scrape finished');
  });

  // Monthly pension snapshot on 1st of month at 07:00
  cron.schedule('0 7 1 * *', async () => {
    logger.info('Monthly pension snapshot generation starting');
    const db = getDb();
    const profiles = db.prepare('SELECT id FROM pension_profiles').all() as { id: string }[];
    const now = new Date();

    for (const profile of profiles) {
      try {
        generateMonthlySnapshots(
          profile.id,
          now.getFullYear(),
          now.getMonth() + 1,
          now.getFullYear(),
          now.getMonth() + 1
        );
        logger.info(`Pension snapshot generated: ${profile.id}`);
      } catch (err) {
        logger.error(`Pension snapshot failed: ${profile.id}`, { err });
      }
    }
    logger.info('Monthly pension snapshot generation finished');
  });

  logger.info('Scheduler initialized');
}
