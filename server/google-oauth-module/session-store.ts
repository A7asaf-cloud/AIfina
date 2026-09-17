import { randomUrlSafe } from './crypto.js';

export type PendingLogin = { state: string; nonce: string; codeVerifier: string; createdAt: number; returnTo: string };
export type UserSession = { googleSubject: string; email: string; name?: string; picture?: string; createdAt: number };

export interface SessionStore {
  createPending(value: PendingLogin): string;
  consumePending(id: string): PendingLogin | undefined;
  createSession(value: UserSession): string;
  getSession(id: string): UserSession | undefined;
  deleteSession(id: string): void;
}

// Replace with Redis/database-backed storage when running more than one server.
export class MemorySessionStore implements SessionStore {
  private pending = new Map<string, PendingLogin>();
  private sessions = new Map<string, UserSession>();

  createPending(value: PendingLogin) { const id = randomUrlSafe(); this.pending.set(id, value); return id; }
  consumePending(id: string) { const value = this.pending.get(id); this.pending.delete(id); return value; }
  createSession(value: UserSession) { const id = randomUrlSafe(); this.sessions.set(id, value); return id; }
  getSession(id: string) { return this.sessions.get(id); }
  deleteSession(id: string) { this.sessions.delete(id); }
}
