import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import {
  hashOtp, verifyOtp, hashToken,
  generateOtp, generateRefreshToken,
  createAccessToken, decodeAccessToken,
} from './authUtils';
import {
  findAuthUserByEmail, findAuthUserById, saveAuthUser, getOrCreateDemoUser,
  getRecentOtps, saveOtp, getUnusedValidOtps, markOtpUsed,
  saveRefreshToken, findRefreshToken, revokeRefreshToken, revokeAllRefreshTokensForUser,
  AuthUserRecord,
} from './authFileStore';
import { sendOtpEmail } from './authEmail';

export const authRouter = Router();

const COOKIE_NAME = 'refresh_token';
const OTP_EXPIRE_MIN = 10;
const OTP_RATE_LIMIT = 3;
const OTP_WINDOW_MIN = 15;
const REFRESH_DAYS = () => parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS || '30');

function setCookie(res: Response, token: string, days: number): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: days * 86_400_000,
    path: '/auth',
  });
}

function clearCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/auth' });
}

function issueRefreshToken(userId: string, deviceInfo: string, days: number): string {
  const plain = generateRefreshToken();
  const now = new Date();
  saveRefreshToken({
    id: crypto.randomUUID(),
    userId,
    token: hashToken(plain),
    deviceInfo: deviceInfo.slice(0, 256),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + days * 86_400_000).toISOString(),
    revoked: false,
  });
  return plain;
}

function formatUser(u: AuthUserRecord) {
  return { id: u.id, email: u.email, name: u.name, avatarUrl: u.avatarUrl, isVerified: u.isVerified };
}

function deviceInfo(req: Request): string {
  return req.headers['user-agent'] || '';
}


// ── POST /auth/otp/request ────────────────────────────────────────────────────
authRouter.post('/otp/request', async (req: Request, res: Response) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email || !email.includes('@') || !email.split('@')[1]?.includes('.')) {
    return res.status(400).json({ detail: 'כתובת אימייל לא תקינה' });
  }

  const recent = getRecentOtps(email, OTP_WINDOW_MIN * 60_000);
  if (recent.length >= OTP_RATE_LIMIT) {
    return res.status(429).json({ detail: 'יותר מדי בקשות — נסה שוב בעוד 15 דקות' });
  }

  const code = generateOtp();
  saveOtp({
    id: crypto.randomUUID(),
    email,
    code: hashOtp(email, code),
    expiresAt: new Date(Date.now() + OTP_EXPIRE_MIN * 60_000).toISOString(),
    used: false,
  });

  try {
    await sendOtpEmail(email, code);
  } catch (err: any) {
    console.error('SMTP error:', err);
    return res.status(502).json({ detail: 'שליחת האימייל נכשלה — בדוק את הגדרות SMTP' });
  }

  return res.json({ message: 'קוד נשלח' });
});


// ── POST /auth/otp/verify ─────────────────────────────────────────────────────
authRouter.post('/otp/verify', async (req: Request, res: Response) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const code  = (req.body.code  || '').trim();

  if (code.length !== 6 || !/^\d+$/.test(code)) {
    return res.status(400).json({ detail: 'קוד חייב להיות 6 ספרות' });
  }

  const candidates = getUnusedValidOtps(email);
  const matched = candidates.find(r => verifyOtp(email, code, r.code));
  if (!matched) {
    return res.status(401).json({ detail: 'קוד שגוי או שפג תוקפו' });
  }

  markOtpUsed(matched.id);

  const now = new Date().toISOString();
  let user = findAuthUserByEmail(email);
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      email,
      name: email.split('@')[0],
      avatarUrl: '',
      googleId: '',
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    };
    saveAuthUser(user);
  } else {
    user = { ...user, isVerified: true, updatedAt: now };
    saveAuthUser(user);
  }

  const days = REFRESH_DAYS();
  const plain = issueRefreshToken(user.id, deviceInfo(req), days);
  setCookie(res, plain, days);
  return res.json({ access_token: createAccessToken(user.id, user.email), user: formatUser(user) });
});


// ── GET /auth/google ──────────────────────────────────────────────────────────
authRouter.get('/google', (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(501).json({ detail: 'Google OAuth לא מוגדר' });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});


// ── GET /auth/google/callback ─────────────────────────────────────────────────
authRouter.get('/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';
  const frontendUrl  = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!clientId || !clientSecret) return res.status(501).send('Google OAuth לא מוגדר');

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }).toString(),
    });
    if (!tokenRes.ok) throw new Error('Token exchange failed');
    const tokenData: any = await tokenRes.json();

    // Get user info
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!infoRes.ok) throw new Error('User info fetch failed');
    const info: any = await infoRes.json();

    const email = (info.email || '').toLowerCase().trim();
    if (!email) throw new Error('No email from Google');

    const now = new Date().toISOString();
    let user = findAuthUserByEmail(email);
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        email,
        name: info.name || email.split('@')[0],
        avatarUrl: info.picture || '',
        googleId: info.sub || '',
        isVerified: true,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      user = { ...user, googleId: info.sub || user.googleId, name: info.name || user.name, avatarUrl: info.picture || user.avatarUrl, updatedAt: now };
    }
    saveAuthUser(user);

    const days = REFRESH_DAYS();
    const plain = issueRefreshToken(user.id, deviceInfo(req), days);
    const accessToken = createAccessToken(user.id, user.email);

    res.cookie(COOKIE_NAME, plain, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: days * 86_400_000,
      path: '/auth',
    });
    return res.redirect(`${frontendUrl}/#access_token=${accessToken}`);
  } catch (err: any) {
    console.error('Google OAuth error:', err);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/#auth_error=google_failed`);
  }
});


// ── POST /auth/refresh ────────────────────────────────────────────────────────
authRouter.post('/refresh', (req: Request, res: Response) => {
  const plain = req.cookies?.[COOKIE_NAME];
  if (!plain) return res.status(401).json({ detail: 'אין refresh token' });

  const record = findRefreshToken(hashToken(plain));
  if (!record) {
    clearCookie(res);
    return res.status(401).json({ detail: 'Refresh token לא תקין או שפג תוקפו' });
  }

  const user = findAuthUserById(record.userId);
  if (!user) return res.status(401).json({ detail: 'משתמש לא נמצא' });

  revokeRefreshToken(record.id);
  const days = REFRESH_DAYS();
  const newPlain = issueRefreshToken(user.id, deviceInfo(req), days);
  setCookie(res, newPlain, days);
  return res.json({ access_token: createAccessToken(user.id, user.email) });
});


// ── POST /auth/logout ─────────────────────────────────────────────────────────
authRouter.post('/logout', (req: Request, res: Response) => {
  const plain = req.cookies?.[COOKIE_NAME];
  if (plain) {
    const record = findRefreshToken(hashToken(plain));
    if (record) revokeRefreshToken(record.id);
  }
  clearCookie(res);
  return res.json({ message: 'התנתקת בהצלחה' });
});


// ── POST /auth/logout-all ─────────────────────────────────────────────────────
authRouter.post('/logout-all', (req: Request, res: Response) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ detail: 'לא מאומת' });
  try {
    const { sub: userId } = decodeAccessToken(auth.slice(7));
    revokeAllRefreshTokensForUser(userId);
    clearCookie(res);
    return res.json({ message: 'התנתקת מכל המכשירים' });
  } catch {
    return res.status(401).json({ detail: 'Access token לא תקין' });
  }
});


// ── GET /auth/me ──────────────────────────────────────────────────────────────
authRouter.get('/me', (req: Request, res: Response) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ detail: 'לא מאומת' });
  try {
    const { sub: userId } = decodeAccessToken(auth.slice(7));
    const user = findAuthUserById(userId);
    if (!user) return res.status(404).json({ detail: 'משתמש לא נמצא' });
    return res.json(formatUser(user));
  } catch {
    return res.status(401).json({ detail: 'Access token לא תקין' });
  }
});


// ── POST /auth/demo ───────────────────────────────────────────────────────────
authRouter.post('/demo', (req: Request, res: Response) => {
  const user = getOrCreateDemoUser();
  const days = REFRESH_DAYS();
  const plain = issueRefreshToken(user.id, deviceInfo(req), days);
  setCookie(res, plain, days);
  return res.json({ access_token: createAccessToken(user.id, user.email), user: formatUser(user) });
});
