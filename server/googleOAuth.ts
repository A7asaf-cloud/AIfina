import crypto from 'crypto';

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function validGoogleState(received: unknown, expected: unknown): boolean {
  return typeof received === 'string' && typeof expected === 'string'
    && /^[a-f0-9]{64}$/.test(received) && /^[a-f0-9]{64}$/.test(expected)
    && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}
