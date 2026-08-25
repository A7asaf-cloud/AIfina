import 'dotenv/config';
import app from './app.js';
import { initDb } from './db/schema.js';
import { initScheduler } from './scheduler/cron.js';
import { logger } from './utils/logger.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

initDb();
initScheduler();

app.listen(PORT, () => {
  logger.info(`Finance scraper running on port ${PORT}`);
});
