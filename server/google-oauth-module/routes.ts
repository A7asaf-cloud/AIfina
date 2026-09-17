import type { Request, Router } from 'express';
import { Router as createRouter } from 'express';
import type { GoogleAuthConfig } from './config.js';
import { GoogleAuthService } from './google-auth.js';
import type { SessionStore } from './session-store.js';

const cookieOptions = (secure: boolean) => ({ httpOnly: true, secure, sameSite: 'lax' as const, path: '/' });
const cookieNames = (secure: boolean) => ({
  pending: secure ? '__Host-google_oauth_pending' : 'google_oauth_pending',
  session: secure ? '__Host-app_session' : 'app_session',
});
function cookie(req: Request, name: string): string | undefined {
  return req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(name + '='))?.slice(name.length + 1);
}
function safeReturnTo(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export function googleAuthRouter(config: GoogleAuthConfig, store: SessionStore, auth = new GoogleAuthService(config, store)): Router {
  const router = createRouter();
  const names = cookieNames(config.cookieSecure);

  router.get('/google/start', (req, res) => {
    const { pendingId, url } = auth.begin(safeReturnTo(req.query.returnTo));
    res.cookie(names.pending, pendingId, { ...cookieOptions(config.cookieSecure), maxAge: 10 * 60_000 });
    res.redirect(url);
  });
  router.get('/google/callback', async (req, res) => {
    try {
      if (typeof req.query.error === 'string') throw new Error('Google authorization was declined');
      const result = await auth.complete(
        cookie(req, names.pending),
        typeof req.query.state === 'string' ? req.query.state : undefined,
        typeof req.query.code === 'string' ? req.query.code : undefined,
      );
      res.clearCookie(names.pending, cookieOptions(config.cookieSecure));
      res.cookie(names.session, result.sessionId, { ...cookieOptions(config.cookieSecure), maxAge: 7 * 24 * 60 * 60_000 });
      res.redirect(result.returnTo);
    } catch {
      res.clearCookie(names.pending, cookieOptions(config.cookieSecure));
      res.redirect('/login?error=google_sign_in_failed');
    }
  });
  router.get('/session', (req, res) => {
    const current = store.getSession(cookie(req, names.session) ?? '');
    res.json({ user: current ?? null });
  });
  router.post('/logout', (req, res) => {
    const origin = req.get('origin');
    if (origin && !config.appOrigins.includes(origin)) return res.sendStatus(403);
    const id = cookie(req, names.session);
    if (id) store.deleteSession(id);
    res.clearCookie(names.session, cookieOptions(config.cookieSecure));
    return res.sendStatus(204);
  });
  return router;
}
