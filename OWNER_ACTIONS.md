# Owner actions only

- Enroll in Apple Developer and Google Play Console.
- Confirm ownership of ai.aifina.app before the first store build.
- Set VITE_AIFINA_API_URL to the real HTTPS API at mobile build time.
- Create Android and iOS OAuth clients in Google Cloud, using the Android package/signing SHA-1 and iOS bundle ID.
- Create Android release keystore and Play signing configuration. Never commit it.
- On macOS/Xcode select the Apple team, configure signing and archive iOS.
- Publish support and privacy-policy URLs.
- Perform physical-device tests for login, Google login, uploads, keyboard, deep links and persistence.
- Replace temporary file/memory user storage with a durable database before releasing.
