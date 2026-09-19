import 'dotenv/config';
import { closeDatabase, initializeDatabase } from './database.js';

initializeDatabase().then(async () => { await closeDatabase(); }).catch(async error => {
  console.error('Database migration failed');
  await closeDatabase();
  process.exitCode = 1;
});
