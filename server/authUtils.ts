import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET     = () => process.env.JWT_SECRET          || 'aifina-default-secret-key-change-in-production';
const REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET  || process.env.JWT_SECRET || 'aifina-refresh-secret-key-change-in-production';
const ACCESS_EXPIRE_SEC   = () => parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '15') * 60;
const REFRESH_EXPIRE_DAYS = () => parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS   || '30');

export const GOOGLE_REDIRECT_URI = () =>
  process.env.GOOGLE_REDIRECT_URI || 'https://aifina.ai.studio/auth/google/callback';

export function hashOtp(email: string, code: string): string {
  return crypto.createHash('sha256').update(`${email.toLowerCase().trim()}:${code}`).digest('hex');
}

export function verifyOtp(email: string, code: string, hashed: string): boolean {
  const expected = Buffer.from(hashOtp(email, code), 'hex');
  const actual   = Buffer.from(hashed, 'hex');
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function generateOtp(): string {
  let otp = '';
  for (let i = 0; i < 6; i++) otp += crypto.randomInt(0, 10).toString();
  return otp;
}

export function createAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email, type: 'access' },
    JWT_SECRET(),
    { expiresIn: ACCESS_EXPIRE_SEC() }
  );
}

export function decodeAccessToken(token: string): { sub: string; email: string } {
  return jwt.verify(token, JWT_SECRET()) as { sub: string; email: string };
}

// ── Stateless JWT refresh tokens (survive server restarts) ────────────────────
// The token itself is signed — no database/file lookup needed on refresh.
// tokenVersion allows logout-all: bump the version in the user record, old tokens fail.

export function createRefreshToken(userId: string, email: string, tokenVersion: number): string {
  return jwt.sign(
    { sub: userId, email, type: 'refresh', ver: tokenVersion },
    REFRESH_SECRET(),
    { expiresIn: `${REFRESH_EXPIRE_DAYS()}d` }
  );
}

export function verifyRefreshToken(token: string): { sub: string; email: string; ver: number } {
  return jwt.verify(token, REFRESH_SECRET()) as { sub: string; email: string; ver: number };
}
