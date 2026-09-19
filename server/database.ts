import { Pool, type PoolClient } from 'pg';

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
  const db = getDatabase();
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL DEFAULT '', avatar_url TEXT NOT NULL DEFAULT '',
      google_id TEXT UNIQUE, is_verified BOOLEAN NOT NULL DEFAULT false, token_version INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS user_financial_data (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data JSONB NOT NULL,
      revision BIGINT NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS user_financial_data_data_idx ON user_financial_data USING GIN (data);
    CREATE TABLE IF NOT EXISTS auth_otp_codes (
      id UUID PRIMARY KEY, email TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS auth_otp_codes_email_idx ON auth_otp_codes(email, expires_at DESC);
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE CASCADE, google_subject TEXT NOT NULL,
      email TEXT NOT NULL, name TEXT, picture TEXT, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id, expires_at);
  `);
}

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDatabase().connect();
  try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function closeDatabase(): Promise<void> { await pool?.end(); pool = undefined; }
