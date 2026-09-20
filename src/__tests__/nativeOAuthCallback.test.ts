import { describe, expect, it } from 'vitest';
import { parseNativeOAuthCallback } from '../mobile';

describe('native OAuth callback', () => {
  it('accepts only the fixed success callback without credentials', () => {
    expect(parseNativeOAuthCallback('aifina://auth/?result=success')).toEqual({ status: 'success' });
  });
  it('handles a safe OAuth error', () => {
    expect(parseNativeOAuthCallback('aifina://auth/?error=access_denied')).toEqual({ status: 'error', error: 'access_denied' });
  });
  it('rejects malformed hosts, redirects, codes and tokens', () => {
    for (const value of ['https://aifina.app/?result=success', 'aifina://evil/?result=success', 'aifina://auth/?redirect=https://evil.test', 'aifina://auth/?code=secret', 'aifina://auth/?access_token=secret', 'aifina://auth/?result=unknown']) {
      expect(parseNativeOAuthCallback(value)).toBeNull();
    }
  });
});
