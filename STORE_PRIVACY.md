# Store privacy inventory

This is an implementation inventory, not a privacy policy.

- Authentication: email/OTP, demo/local session, and Google OAuth when configured.
- Financial data: profile, transactions, budgets, standing orders, investments and salary tracking.
- Uploads: user-selected images and statement files can be sent to the AIfina API for AI extraction.
- AI: the server sends requested analysis content to Google Gemini using a server-held key.
- Third parties: Google OAuth, Google Gemini, public market-data sources, and an optional finance-scraper/open-banking provider.
- Local data: local-mode accounts and cached app data use browser storage.
- No analytics SDK was found in the audited React app.

Current blocker: Google-session and user JSON persistence use memory/filesystem storage, not a durable per-user database. Add durable storage, deletion and retention behavior before store release.
