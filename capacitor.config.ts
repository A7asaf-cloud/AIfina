import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'ai.aifina.app',
  appName: 'AIfina',
  webDir: 'dist',
  android: { allowMixedContent: false },
  ios: { contentInset: 'always' },
  plugins: {
    SplashScreen: { launchShowDuration: 500, launchAutoHide: true, backgroundColor: '#F9FDF6', showSpinner: false },
    StatusBar: { style: 'LIGHT', backgroundColor: '#F9FDF6', overlaysWebView: false },
    Keyboard: { resize: KeyboardResize.Body, resizeOnFullScreen: true },
  },
};

export default config;
