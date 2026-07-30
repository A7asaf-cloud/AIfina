import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(filename: string): T[] {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return []; }
}

function writeJson<T>(filename: string, data: T[]): void {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf8');
}

// ── Auth user records ─────────────────────────────────────────────────────────
export interface AuthUserRecord {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  googleId: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  tokenVersion: number;   // incremented on logout-all; old refresh tokens become invalid
}

const AUTH_USERS_FILE = 'auth_users.json';

export function getAllAuthUsers(): AuthUserRecord[] {
  return readJson<AuthUserRecord>(AUTH_USERS_FILE);
}

export function findAuthUserByEmail(email: string): AuthUserRecord | undefined {
  return getAllAuthUsers().find(u => u.email === email.toLowerCase().trim());
}

export function findAuthUserById(id: string): AuthUserRecord | undefined {
  return getAllAuthUsers().find(u => u.id === id);
}

export function saveAuthUser(user: AuthUserRecord): void {
  const users = getAllAuthUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) users[idx] = user; else users.push(user);
  writeJson(AUTH_USERS_FILE, users);
}

export function getOrCreateDemoUser(): AuthUserRecord {
  const email = 'demo@finance.il';
  let user = findAuthUserByEmail(email);
  if (!user) {
    user = {
      id: 'demo_user_id',
      email,
      name: 'ישראל ישראלי',
      avatarUrl: '',
      googleId: '',
      isVerified: true,
      tokenVersion: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveAuthUser(user);
  }
  return user;
}

export function incrementTokenVersion(userId: string): number {
  const users = getAllAuthUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx < 0) return 0;
  users[idx].tokenVersion = (users[idx].tokenVersion || 0) + 1;
  writeJson(AUTH_USERS_FILE, users);
  return users[idx].tokenVersion;
}

// ── OTP records ───────────────────────────────────────────────────────────────
export interface OtpRecord {
  id: string;
  email: string;
  code: string;      // SHA-256 hash
  expiresAt: string; // ISO
  used: boolean;
}

const OTP_FILE = 'auth_otp_codes.json';

export function getRecentOtps(email: string, windowMs: number): OtpRecord[] {
  const cutoff = new Date(Date.now() - windowMs).toISOString();
  return readJson<OtpRecord>(OTP_FILE).filter(
    r => r.email === email && r.expiresAt > cutoff
  );
}

export function saveOtp(record: OtpRecord): void {
  const otps = readJson<OtpRecord>(OTP_FILE);
  otps.push(record);
  writeJson(OTP_FILE, otps);
}

export function getUnusedValidOtps(email: string): OtpRecord[] {
  const now = new Date().toISOString();
  return readJson<OtpRecord>(OTP_FILE)
    .filter(r => r.email === email && !r.used && r.expiresAt > now)
    .sort((a, b) => b.expiresAt.localeCompare(a.expiresAt));
}

export function markOtpUsed(id: string): void {
  const otps = readJson<OtpRecord>(OTP_FILE).map(r => r.id === id ? { ...r, used: true } : r);
  writeJson(OTP_FILE, otps);
}

// ── Refresh token records ─────────────────────────────────────────────────────
export interface RefreshTokenRecord {
  id: string;
  userId: string;
  token: string;     // SHA-256 hash
  deviceInfo: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
}

const RT_FILE = 'auth_refresh_tokens.json';

export function saveRefreshToken(record: RefreshTokenRecord): void {
  const tokens = readJson<RefreshTokenRecord>(RT_FILE);
  tokens.push(record);
  writeJson(RT_FILE, tokens);
}

export function findRefreshToken(hashedToken: string): RefreshTokenRecord | undefined {
  const now = new Date().toISOString();
  return readJson<RefreshTokenRecord>(RT_FILE).find(
    r => r.token === hashedToken && !r.revoked && r.expiresAt > now
  );
}

export function revokeRefreshToken(id: string): void {
  const tokens = readJson<RefreshTokenRecord>(RT_FILE).map(r =>
    r.id === id ? { ...r, revoked: true } : r
  );
  writeJson(RT_FILE, tokens);
}

export function revokeAllRefreshTokensForUser(userId: string): void {
  const tokens = readJson<RefreshTokenRecord>(RT_FILE).map(r =>
    r.userId === userId ? { ...r, revoked: true } : r
  );
  writeJson(RT_FILE, tokens);
}
