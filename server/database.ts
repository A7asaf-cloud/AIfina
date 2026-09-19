import { Pool, type PoolClient } from 'pg';
import { migrations } from './migrations.js';

/** Production persistence. DATABASE_URL must point at managed PostgreSQL. */
let pool: Pool | undefined;

export function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL is required. File and memory storage are not supported.');
  return value;
}

export function getDatabase(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl(),
      ssl: process.env.DATABASE_SSL === 'false' ? false : process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export async function initializeDatabase(): Promise<void> {
  await withTransaction(async client => {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
    for (const migration of migrations) {
      const applied = await client.query('SELECT 1 FROM schema_migrations WHERE id = $1', [migration.id]);
      if (!applied.rowCount) { await migration.up(client); await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]); }
    }
  });
}

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDatabase().connect();
  try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function closeDatabase(): Promise<void> { await pool?.end(); pool = undefined; }
