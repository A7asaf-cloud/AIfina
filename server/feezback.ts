import crypto from 'node:crypto';

type FeezbackEnvironment = 'integration' | 'production';

const base64Url = (value: Buffer | string) => Buffer.from(value).toString('base64url');

export function feezbackIsConfigured(): boolean {
  return Boolean(process.env.FEEZBACK_TPP_ID?.trim() && process.env.FEEZBACK_PRIVATE_KEY?.trim());
}

/**
 * Creates an AIS consent link exclusively on the server. The signed token and
 * private key must never be returned to the browser or committed to source.
 */
export async function createFeezbackConsentLink(userId: string, appOrigin: string) {
  const tppId = process.env.FEEZBACK_TPP_ID?.trim();
  const privateKey = process.env.FEEZBACK_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const env: FeezbackEnvironment = process.env.FEEZBACK_ENV === 'production' ? 'production' : 'integration';
  if (!tppId || !privateKey) throw new Error('Open Banking is not configured on this server.');

  const now = Math.floor(Date.now() / 1000);
  const context = crypto.randomUUID();
  const payload = {
    sub: userId,
    iss: `tpp/${tppId}`,
    srv: 'ais/user',
    iat: now,
    exp: now + 30 * 60,
    ttl: 1800,
    flow: {
      id: 'aifina',
      dataBaskets: ['ACCOUNTS', 'BALANCES', 'TRANSACTIONS'],
      accountTypes: ['CACC', 'CARD', 'SVGS', 'LOAN', 'SCTS'],
      timePeriods: ['TWELVE_MONTHS'],
      userWasAuthenticated: true,
      context,
      redirects: {
        success: `${appOrigin}/connections?openBanking=success`,
        failure: `${appOrigin}/connections?openBanking=failed`,
        ttlExpired: `${appOrigin}/connections?openBanking=expired`,
      },
    },
  };
  const encodedHeader = base64Url(JSON.stringify({ alg: 'RS512', typ: 'JWT' }));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signed = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.sign('RSA-SHA512', Buffer.from(signed), privateKey);
  const token = `${signed}.${base64Url(signature)}`;
  const endpoint = env === 'production'
    ? 'https://lgs-prod.feezback.cloud/link'
    : 'https://lgs-integ01.feezback.cloud/link';
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
  });
  if (!response.ok) throw new Error(`Open Banking link service returned ${response.status}.`);
  const body = await response.json() as { link?: string; url?: string };
  const link = body.link || body.url;
  if (!link || !/^https:\/\//.test(link)) throw new Error('Open Banking link service returned an invalid link.');
  return { link, context, expiresAt: new Date((now + 1800) * 1000).toISOString() };
}
