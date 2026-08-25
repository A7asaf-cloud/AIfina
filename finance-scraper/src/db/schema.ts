import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.js';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

export function initDb(): void {
  const dbPath = process.env.DB_PATH ?? './data/finance.db';
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS institutions (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      credentials_encrypted TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      last_scraped_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL REFERENCES institutions(id),
      account_number TEXT NOT NULL,
      date TEXT NOT NULL,
      processed_date TEXT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      original_amount REAL,
      original_currency TEXT DEFAULT 'ILS',
      charged_amount REAL,
      type TEXT,
      status TEXT,
      installment_number INTEGER,
      installment_total INTEGER,
      category TEXT,
      memo TEXT,
      identifier TEXT,
      UNIQUE(institution_id, identifier, date)
    );

    CREATE TABLE IF NOT EXISTS scrape_logs (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT,
      transactions_found INTEGER DEFAULT 0,
      transactions_new INTEGER DEFAULT 0,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS ai_insights (
      id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT (datetime('now')),
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      insight_type TEXT NOT NULL,
      content TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pension_profiles (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      gross_salary REAL NOT NULL,
      salary_effective_date TEXT NOT NULL,

      kh_employer_pct REAL NOT NULL DEFAULT 7.5,
      kh_employee_pct REAL NOT NULL DEFAULT 2.5,
      kh_ceiling REAL NOT NULL DEFAULT 15712,
      kh_start_date TEXT NOT NULL,
      kh_current_balance REAL DEFAULT 0,
      kh_last_manual_balance_date TEXT,

      pension_employer_pct REAL NOT NULL DEFAULT 6.5,
      pension_employee_pct REAL NOT NULL DEFAULT 6.0,
      pension_employer_compensation_pct REAL NOT NULL DEFAULT 8.33,
      pension_ceiling REAL NOT NULL DEFAULT 47465,
      pension_start_date TEXT NOT NULL,
      pension_current_balance REAL DEFAULT 0,
      pension_last_manual_balance_date TEXT,

      disability_pct REAL NOT NULL DEFAULT 2.5,

      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pension_monthly_snapshots (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES pension_profiles(id),
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      gross_salary REAL NOT NULL,

      kh_taxable_salary REAL NOT NULL,
      kh_employer_deposit REAL NOT NULL,
      kh_employee_deposit REAL NOT NULL,
      kh_total_deposit REAL NOT NULL,
      kh_cumulative_balance REAL NOT NULL,

      pension_taxable_salary REAL NOT NULL,
      pension_employer_deposit REAL NOT NULL,
      pension_employee_deposit REAL NOT NULL,
      pension_employer_compensation REAL NOT NULL,
      pension_total_deposit REAL NOT NULL,
      pension_cumulative_balance REAL NOT NULL,

      total_monthly_deposit REAL NOT NULL,
      total_cumulative REAL NOT NULL,

      UNIQUE(profile_id, year, month)
    );
  `);

  logger.info(`Database initialized at ${dbPath}`);
}
