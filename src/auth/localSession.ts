export const LOCAL_USER_ID = 'local_personal_v1';
const LOCAL_MODE_KEY = 'aifina_local_mode';
export function isLocalMode(): boolean {
  try { return localStorage.getItem(LOCAL_MODE_KEY) === '1'; } catch { return false; }
}
export function enterLocalMode(): void {
  // Fail visibly rather than promising persistence when browser storage is blocked.
  localStorage.setItem(LOCAL_MODE_KEY, '1');
}
export function leaveLocalMode(): void { localStorage.removeItem(LOCAL_MODE_KEY); }
export const localUser = { id: LOCAL_USER_ID, email: '', name: 'החשבון המקומי שלי', avatarUrl: '', isVerified: false };
