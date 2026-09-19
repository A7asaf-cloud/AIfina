import type { PoolClient } from 'pg';

type Migration = { id: string; up: (client: PoolClient) => Promise<void> };

const initialSchema = async (db: PoolClient) => {
  await db.query(`CREATE TABLE users (id UUID PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL DEFAULT '', avatar_url TEXT NOT NULL DEFAULT '', google_id TEXT UNIQUE, is_verified BOOLEAN NOT NULL DEFAULT false, token_version INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
  await db.query(`CREATE TABLE user_financial_data (user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data JSONB NOT NULL, revision BIGINT NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
  await db.query('CREATE INDEX user_financial_data_data_idx ON user_financial_data USING GIN (data)');
  await db.query(`CREATE TABLE auth_otp_codes (id UUID PRIMARY KEY, email TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
  await db.query('CREATE INDEX auth_otp_codes_email_idx ON auth_otp_codes(email, expires_at DESC)');
  await db.query(`CREATE TABLE auth_sessions (id TEXT PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE CASCADE, google_subject TEXT NOT NULL, email TEXT NOT NULL, name TEXT, picture TEXT, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
  await db.query('CREATE INDEX auth_sessions_user_idx ON auth_sessions(user_id, expires_at)');
};

export const migrations: Migration[] = [{ id: '001_initial', up: initialSchema }];
