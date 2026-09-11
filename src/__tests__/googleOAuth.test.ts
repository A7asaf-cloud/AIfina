import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleConfigured, validGoogleState } from '../../server/googleOAuth';

afterEach(() => vi.unstubAllEnvs());
describe('Google OAuth guards', () => {
  it('requires both credentials', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '');
    expect(googleConfigured()).toBe(false);
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-only-secret');
    expect(googleConfigured()).toBe(true);
  });
  it('rejects empty or malformed state', () => {
    expect(validGoogleState(undefined, undefined)).toBe(false);
    expect(validGoogleState('', '')).toBe(false);
    expect(validGoogleState(['a'.repeat(64)], 'a'.repeat(64))).toBe(false);
    expect(validGoogleState('x'.repeat(64), 'x'.repeat(64))).toBe(false);
  });
  it('requires state from the initiating browser', () => {
    expect(validGoogleState('a'.repeat(64), 'b'.repeat(64))).toBe(false);
    expect(validGoogleState('a'.repeat(64), 'a'.repeat(64))).toBe(true);
  });
});
