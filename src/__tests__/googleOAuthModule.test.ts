import express from 'express';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import type { TokenPayload } from 'google-auth-library';
import { GoogleAuthService, type GoogleClient } from '../../server/google-oauth-module/google-auth';
import { googleAuthRouter } from '../../server/google-oauth-module/routes';
import type { GoogleAuthConfig } from '../../server/google-oauth-module/config';
import { MemorySessionStore } from '../../server/google-oauth-module/session-store';

const config: GoogleAuthConfig = {
  clientId: 'client.apps.googleusercontent.com',
  clientSecret: 'test-secret',
  redirectUri: 'http://localhost:3000/auth/google/callback',
  appOrigins: ['http://localhost:3000'],
  sessionSecret: 'x'.repeat(32),
  cookieSecure: false,
};

const servers: import('node:http').Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))));
});

describe('Google OAuth module', () => {
  it('uses PKCE and creates a session only after a valid callback', async () => {
    let options: Record<string, unknown> | undefined;
    const client: GoogleClient = {
      generateAuthUrl(value) { options = value; return 'https://accounts.google.com/mock'; },
      async getToken() { return { tokens: { id_token: 'mock-token' } }; },
      async verifyIdToken() {
        return {
          getPayload: () => ({
            sub: 'google-456',
            email: 'flow@example.test',
            email_verified: true,
            nonce: options?.nonce as string,
          } as TokenPayload),
        };
      },
    };
    const store = new MemorySessionStore();
    const app = express();
    app.use('/auth', googleAuthRouter(config, store, new GoogleAuthService(config, store, client)));
    const server = await new Promise<import('node:http').Server>(resolve => {
      const value = app.listen(0, () => resolve(value));
    });
    servers.push(server);
    const port = (server.address() as AddressInfo).port;

    const started = await fetch('http://127.0.0.1:' + port + '/auth/google/start?returnTo=/account', { redirect: 'manual' });
    const pendingCookie = started.headers.getSetCookie()[0].split(';')[0];
    expect(started.status).toBe(302);
    expect(options?.code_challenge_method).toBe('S256');
    expect(typeof options?.state).toBe('string');
    expect(typeof options?.nonce).toBe('string');

    const callback = await fetch('http://127.0.0.1:' + port + '/auth/google/callback?code=code&state=' + options?.state, {
      headers: { cookie: pendingCookie },
      redirect: 'manual',
    });
    const sessionCookie = callback.headers.getSetCookie().find(value => value.startsWith('app_session='))?.split(';')[0];
    expect(callback.headers.get('location')).toBe('/account');
    expect(sessionCookie).toBeTruthy();

    const session = await fetch('http://127.0.0.1:' + port + '/auth/session', { headers: { cookie: sessionCookie! } });
    await expect(session.json()).resolves.toMatchObject({ user: { googleSubject: 'google-456', email: 'flow@example.test' } });
  });

  it('clears the session with POST /auth/logout', async () => {
    const store = new MemorySessionStore();
    const sessionId = store.createSession({ googleSubject: 'google-789', email: 'person@example.test', createdAt: Date.now() });
    const app = express();
    app.use('/auth', googleAuthRouter(config, store));
    const server = await new Promise<import('node:http').Server>(resolve => {
      const value = app.listen(0, () => resolve(value));
    });
    servers.push(server);
    const port = (server.address() as AddressInfo).port;
    const cookie = 'app_session=' + sessionId;

    const logout = await fetch('http://127.0.0.1:' + port + '/auth/logout', {
      method: 'POST',
      headers: { cookie, origin: 'http://localhost:3000' },
    });
    expect(logout.status).toBe(204);
    expect(store.getSession(sessionId)).toBeUndefined();

    const session = await fetch('http://127.0.0.1:' + port + '/auth/session', { headers: { cookie } });
    await expect(session.json()).resolves.toEqual({ user: null });
  });
});
