import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const randomUrlSafe = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const sha256UrlSafe = (value: string) => createHash('sha256').update(value).digest('base64url');

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
