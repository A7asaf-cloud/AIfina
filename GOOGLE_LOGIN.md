# Google sign-in setup

Google Cloud project created for this app: `aifina-508221`.
The account owner completed branding and accepted Google's User Data Policy.
The `AIfina Local Web` OAuth client is configured for local development, and the owner's account is registered as a test user.
Credentials are installed only in the ignored local `.env`. The local server redirects successfully to Google's AIfina account chooser; completion of account consent and the callback is still pending user verification.

After completing branding, create an OAuth client of type Web application.
For local development authorize `http://localhost:3000/auth/google/callback`.
Set these values in the ignored local `.env` (or your deployment's secret settings):

```
GOOGLE_CLIENT_ID=<issued client ID>
GOOGLE_CLIENT_SECRET=<issued client secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

Restart the server. In testing mode configure your intended test users.
Open `http://localhost:3000`, select Google, and complete the consent flow yourself.
The app requests only basic identity scopes: openid, email, profile.
It checks a browser-bound state cookie and Google's verified email before creating a session.
`GET /auth/google/status` reports configuration presence only, not live verification.

Production requires your actual HTTPS callback URL registered in Google, matching environment values,
a strong JWT_SECRET, and a persistent private data store. Pushing code does not install server secrets.
Never commit `.env`, OAuth JSON downloads, or account data.
