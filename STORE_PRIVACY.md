# Store privacy inventory

This is an implementation inventory, not a privacy policy.

- Authentication: email/OTP, demo/local session, and Google OAuth when configured.
- Financial data: profile, transactions, budgets, standing orders, investments and salary tracking.
- Uploads: user-selected images and statement files can be sent to the AIfina API for AI extraction.
- AI: the server sends requested analysis content to Google Gemini using a server-held key.
- Third parties: Google OAuth, Google Gemini, public market-data sources, and an optional finance-scraper/open-banking provider.
- Local data: local-mode accounts and cached app data use browser storage.
- No analytics SDK was found in the audited React app.

Persistence: users, OAuth sessions, OTP hashes and the per-user financial-data document are stored in PostgreSQL. Session IDs are httpOnly cookies; Gemini and OAuth secrets are server environment variables and are not part of the web/mobile bundle. Account deletion deletes the user and related financial/session/OTP records through database foreign-key cascades.
