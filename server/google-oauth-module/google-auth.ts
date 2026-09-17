import { CodeChallengeMethod, OAuth2Client, type GenerateAuthUrlOpts, type TokenPayload } from 'google-auth-library';
import { randomUrlSafe, safeEqual, sha256UrlSafe } from './crypto.js';
import type { GoogleAuthConfig } from './config.js';
import type { PendingLogin, SessionStore, UserSession } from './session-store.js';

export type VerifiedGoogleUser = Omit<UserSession, 'createdAt'>;
export interface GoogleClient {
  generateAuthUrl(options: GenerateAuthUrlOpts): string;
  getToken(code: string | { code: string; codeVerifier: string }): Promise<{ tokens: { id_token?: string | null } }>;
  verifyIdToken(options: { idToken: string; audience: string }): Promise<{ getPayload(): TokenPayload | undefined }>;
}

export class GoogleAuthService {
  constructor(
    private config: GoogleAuthConfig,
    private store: SessionStore,
    private client: GoogleClient = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri),
  ) {}

  begin(returnTo: string) {
    const state = randomUrlSafe();
    const nonce = randomUrlSafe();
    const codeVerifier = randomUrlSafe(64);
    const pending: PendingLogin = { state, nonce, codeVerifier, createdAt: Date.now(), returnTo };
    const pendingId = this.store.createPending(pending);
    return {
      pendingId,
      url: this.client.generateAuthUrl({
        access_type: 'offline',
        response_type: 'code',
        scope: ['openid', 'email', 'profile'],
        state,
        nonce,
        code_challenge: sha256UrlSafe(codeVerifier),
        code_challenge_method: CodeChallengeMethod.S256,
        prompt: 'select_account',
      }),
    };
  }

  async complete(pendingId: string | undefined, state: string | undefined, code: string | undefined) {
    if (!pendingId || !state || !code) throw new Error('Invalid OAuth callback');
    const pending = this.store.consumePending(pendingId);
    if (!pending || Date.now() - pending.createdAt > 10 * 60_000 || !safeEqual(pending.state, state)) {
      throw new Error('OAuth state validation failed');
    }
    const tokens = await this.client.getToken({ code, codeVerifier: pending.codeVerifier });
    if (!tokens.tokens.id_token) throw new Error('Google did not return an ID token');
    const payload = (await this.client.verifyIdToken({ idToken: tokens.tokens.id_token, audience: this.config.clientId })).getPayload();
    if (!payload || payload.nonce !== pending.nonce || payload.email_verified !== true || typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      throw new Error('Google identity token validation failed');
    }
    const user: UserSession = {
      googleSubject: payload.sub,
      email: payload.email,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      picture: typeof payload.picture === 'string' ? payload.picture : undefined,
      createdAt: Date.now(),
    };
    return { sessionId: this.store.createSession(user), user, returnTo: pending.returnTo };
  }
}
