import { randomUrlSafe } from './crypto.js';
import { getDatabase } from '../database.js';
import crypto from 'crypto';

export type PendingLogin = { state: string; nonce: string; codeVerifier: string; createdAt: number; returnTo: string };
export type UserSession = { googleSubject: string; email: string; name?: string; picture?: string; createdAt: number };

export interface SessionStore {
  createPending(value: PendingLogin): Promise<string>;
  consumePending(id: string): Promise<PendingLogin | undefined>;
  createSession(value: UserSession): Promise<string>;
  getSession(id: string): Promise<UserSession | undefined>;
  deleteSession(id: string): Promise<void>;
}

// Replace with Redis/database-backed storage when running more than one server.
export class MemorySessionStore implements SessionStore {
  private pending = new Map<string, PendingLogin>();
  private sessions = new Map<string, UserSession>();

  async createPending(value: PendingLogin) { const id = randomUrlSafe(); this.pending.set(id, value); return id; }
  async consumePending(id: string) { const value = this.pending.get(id); this.pending.delete(id); return value; }
  async createSession(value: UserSession) { const id = randomUrlSafe(); this.sessions.set(id, value); return id; }
  async getSession(id: string) { return this.sessions.get(id); }
  async deleteSession(id: string) { this.sessions.delete(id); }
}

/** Durable sessions for all production instances. Pending OAuth state is retained in the same DB. */
export class PostgresSessionStore implements SessionStore {
  async createPending(value: PendingLogin) { const id = `pending:${randomUrlSafe()}`; await getDatabase().query('INSERT INTO auth_sessions (id,google_subject,email,name,picture,expires_at) VALUES ($1,$2,$3,$4,$5,$6)', [id, value.state, '', JSON.stringify(value), null, new Date(Date.now() + 10 * 60_000)]); return id; }
  async consumePending(id: string) { const q = await getDatabase().query('DELETE FROM auth_sessions WHERE id=$1 AND expires_at > now() RETURNING name', [id]); try { return q.rows[0] ? JSON.parse(q.rows[0].name) : undefined; } catch { return undefined; } }
  async createSession(value: UserSession) { const db=getDatabase(); const user = await db.query(`INSERT INTO users (id,email,name,avatar_url,google_id,is_verified) VALUES ($1,$2,$3,$4,$5,true)
    ON CONFLICT (google_id) DO UPDATE SET email=EXCLUDED.email,name=EXCLUDED.name,avatar_url=EXCLUDED.avatar_url,is_verified=true,updated_at=now() RETURNING id`, [crypto.randomUUID(),value.email.toLowerCase(),value.name ?? '',value.picture ?? '',value.googleSubject]); const id = randomUrlSafe(); await db.query('INSERT INTO auth_sessions (id,user_id,google_subject,email,name,picture,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id,user.rows[0].id,value.googleSubject,value.email,value.name ?? null,value.picture ?? null,new Date(Date.now()+7*24*60*60_000)]); return id; }
  async getSession(id: string) { const q = await getDatabase().query('SELECT user_id,email,name,picture,created_at FROM auth_sessions WHERE id=$1 AND expires_at > now()', [id]); const r=q.rows[0]; return r ? { googleSubject:r.user_id,email:r.email,name:r.name ?? undefined,picture:r.picture ?? undefined,createdAt:new Date(r.created_at).getTime() } : undefined; }
  async deleteSession(id: string) { await getDatabase().query('DELETE FROM auth_sessions WHERE id=$1', [id]); }
}
