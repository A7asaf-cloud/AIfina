# Production deployment

Deploy the Node backend as a stateless container (Cloud Run is a supported example) and use managed PostgreSQL (Cloud SQL for PostgreSQL is the Google-hosted recommendation). Run `npm run db:migrate` as a release step before starting application instances; migrations are idempotent and tracked in `schema_migrations`.

Required server-only environment variables: `DATABASE_URL`, `DATABASE_SSL=true`, `JWT_SECRET`, `SESSION_SECRET`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `APP_ORIGINS`, `COOKIE_SECURE=true`, and SMTP values only when email OTP is enabled. None may be set as `VITE_*` variables.

For local development use an isolated PostgreSQL database and `DATABASE_SSL=false`. The CI database is disposable and uses no production credential. `ENABLE_FINANCE_SCRAPER` remains false unless the optional legacy integration is separately deployed.

Google OAuth needs three clients: Web (`https://your-domain/auth/google/callback`), Android (package `ai.aifina.app` plus the release signing SHA-1), and iOS (bundle `ai.aifina.app`). Android and iOS register `aifina://auth` for a native return; configure the backend mobile redirect value only after the Google clients are created.
