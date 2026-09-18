# AIfina mobile release

Capacitor packages the existing React/Vite build into Android and iOS shells. The native identifier is ai.aifina.app; version is 1.0.0 / Android versionCode 1.

Build: copy .env.mobile.example to .env.mobile, set VITE_AIFINA_API_URL to the HTTPS production API, then run npm run mobile:sync. Android debug requires a JDK and Android SDK. iOS archive requires macOS/Xcode.

Never put Gemini, OAuth client secrets, JWT, SMTP, or database credentials in .env.mobile. Vite variables are public.

Mobile Google login requires distinct Android and iOS OAuth clients, configured in Google Cloud with the Android package/signing certificate and iOS bundle ID. Web OAuth remains at https://aifina.ai.studio/auth/google/callback.

Increase Android versionCode and iOS build number for every store upload. Signing credentials remain owner-only.
