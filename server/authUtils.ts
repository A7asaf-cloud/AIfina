import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = () => process.env.JWT_SECRET || 'aifina-default-secret-key-change-in-production';
export const GOOGLE_REDIRECT_URI = () =>
  process.env.GOOGLE_REDIRECT_URI || 'https://aifina.ai.studio/auth/google/callback';
const ACCESS_EXPIRE_SEC = () => parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '15') * 60;

export function hashOtp(email: string, code: string): string {
  return crypto.createHash('sha256').update(`${email.toLowerCase().trim()}:${code}`).digest('hex');
}

export function verifyOtp(email: string, code: string, hashed: string): boolean {
  const expected = Buffer.from(hashOtp(email, code), 'hex');
  const actual   = Buffer.from(hashed, 'hex');
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateOtp(): string {
  let otp = '';
  for (let i = 0; i < 6; i++) otp += crypto.randomInt(0, 10).toString();
  return otp;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export function createAccessToken(userId: string, email: string): string {
  const secret = JWT_SECRET();
  if (!secret) throw new Error('JWT_SECRET is not set');
  return jwt.sign({ sub: userId, email, type: 'access' }, secret, { expiresIn: ACCESS_EXPIRE_SEC() });
}

export function decodeAccessToken(token: string): { sub: string; email: string } {
  const secret = JWT_SECRET();
  if (!secret) throw new Error('JWT_SECRET is not set');
  return jwt.verify(token, secret) as { sub: string; email: string };
}
