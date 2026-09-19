import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

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
    // The backend returns to this registered private scheme after native OAuth.
    if (url.startsWith('aifina://auth')) window.location.assign('/#' + (url.split('?')[1] ?? ''));
  });
}
