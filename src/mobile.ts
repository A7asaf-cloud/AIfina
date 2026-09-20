import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

export type NativeOAuthCallback = { status: 'success' } | { status: 'error'; error: string };

/** Parses only the fixed private callback. Tokens, codes and arbitrary redirects are rejected. */
export function parseNativeOAuthCallback(rawUrl: string): NativeOAuthCallback | null {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return null; }
  if (url.protocol !== 'aifina:' || url.hostname !== 'auth' || url.pathname !== '/') return null;
  const keys = [...url.searchParams.keys()];
  if (keys.some(key => !['result', 'error'].includes(key))) return null;
  if (url.searchParams.get('result') === 'success' && !url.searchParams.get('error')) return { status: 'success' };
  const error = url.searchParams.get('error');
  return error && /^[a-z_]+$/.test(error) ? { status: 'error', error } : null;
}

export async function configureNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await Promise.allSettled([
    StatusBar.setStyle({ style: Style.Light }),
    StatusBar.setBackgroundColor({ color: '#F9FDF6' }),
    StatusBar.setOverlaysWebView({ overlay: false }),
    Keyboard.setResizeMode({ mode: KeyboardResize.Body }),
    SplashScreen.hide(),
  ]);
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
  });
  App.addListener('appUrlOpen', ({ url }) => {
    const callback = parseNativeOAuthCallback(url);
    if (!callback) return;
    // No credential is ever forwarded to the hash or JavaScript. The session stays server-side.
    window.dispatchEvent(new CustomEvent('aifina-native-oauth', { detail: callback }));
  });
}
