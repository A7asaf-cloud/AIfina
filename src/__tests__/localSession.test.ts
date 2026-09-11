import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { LOCAL_USER_ID, enterLocalMode, leaveLocalMode, isLocalMode } from '../auth/localSession';
vi.mock('../auth/AuthContext', () => ({ getMemToken: () => 'cloud-token-must-not-be-used' }));
import { StorageService } from '../services/storage';

beforeEach(() => {
  const entries = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => entries.get(k) ?? null, setItem: (k: string, v: string) => entries.set(k,v), removeItem: (k: string) => entries.delete(k) });
  vi.stubGlobal('fetch', vi.fn());
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());
it('keeps personal data across leaving and re-entering local mode', () => {
  enterLocalMode();
  const empty = StorageService.getUserData(LOCAL_USER_ID);
  expect(empty.transactions).toEqual([]);
  StorageService.saveUserData(LOCAL_USER_ID, { profile: { ...empty.profile, name: 'Local test', bankBalance: 987, onboardingDone: true } });
  leaveLocalMode();
  expect(isLocalMode()).toBe(false);
  enterLocalMode();
  expect(StorageService.getUserData(LOCAL_USER_ID).profile.bankBalance).toBe(987);
  expect(StorageService.getUserData(LOCAL_USER_ID).profile.onboardingDone).toBe(true);
});
it('never syncs local data even when a cloud token exists', async () => {
  StorageService.saveUserData(LOCAL_USER_ID, { transactions: [] });
  StorageService.pushToServer(LOCAL_USER_ID);
  expect(await StorageService.loadFromServer(LOCAL_USER_ID, 'token')).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
  expect(localStorage.getItem('fil_demo_v2_data')).toBeNull();
});
it('reports storage failure', () => {
  localStorage.setItem = () => { throw new Error('quota'); };
  expect(() => enterLocalMode()).toThrow();
  StorageService.saveUserData(LOCAL_USER_ID, { transactions: [] });
  expect(window.dispatchEvent).toHaveBeenCalled();
});
