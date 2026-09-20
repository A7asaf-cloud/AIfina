var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express4 = __toESM(require("express"), 1);

// server/authUtils.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var JWT_SECRET = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s === "aifina-default-secret-key-change-in-production") console.warn("[AUTH] WARNING: JWT_SECRET not set \u2014 using insecure default. Set JWT_SECRET in .env");
  return s || "aifina-default-secret-key-change-in-production";
};
var REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "aifina-refresh-secret-key-change-in-production";
var ACCESS_EXPIRE_SEC = () => parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || "15") * 60;
var REFRESH_EXPIRE_DAYS = () => parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS || "30");
var GOOGLE_REDIRECT_URI = () => process.env.GOOGLE_REDIRECT_URI || (process.env.NODE_ENV === "production" ? "https://aifina.ai.studio/auth/google/callback" : "http://localhost:3000/auth/google/callback");
function hashOtp(email, code) {
  return import_crypto.default.createHash("sha256").update(`${email.toLowerCase().trim()}:${code}`).digest("hex");
}
function verifyOtp(email, code, hashed) {
  const expected = Buffer.from(hashOtp(email, code), "hex");
  const actual = Buffer.from(hashed, "hex");
  if (expected.length !== actual.length) return false;
  return import_crypto.default.timingSafeEqual(expected, actual);
}
function generateOtp() {
  let otp = "";
  for (let i = 0; i < 6; i++) otp += import_crypto.default.randomInt(0, 10).toString();
  return otp;
}
function createAccessToken(userId, email) {
  return import_jsonwebtoken.default.sign(
    { sub: userId, email, type: "access" },
    JWT_SECRET(),
    { expiresIn: ACCESS_EXPIRE_SEC() }
  );
}
function decodeAccessToken(token) {
  return import_jsonwebtoken.default.verify(token, JWT_SECRET());
}
function createRefreshToken(userId, email, tokenVersion) {
  return import_jsonwebtoken.default.sign(
    { sub: userId, email, type: "refresh", ver: tokenVersion },
    REFRESH_SECRET(),
    { expiresIn: `${REFRESH_EXPIRE_DAYS()}d` }
  );
}
function verifyRefreshToken(token) {
  return import_jsonwebtoken.default.verify(token, REFRESH_SECRET());
}

// server/integrationConfig.ts
var configuredAiModel = () => process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
var serverAiKey = () => {
  const value = process.env.GEMINI_API_KEY?.trim();
  return value && !value.startsWith("your_") ? value : void 0;
};
var integrationAuth = (req, res, next) => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "aifina-default-secret-key-change-in-production") {
    res.status(503).json({ error: "Configure a secure JWT_SECRET on the server." });
    return;
  }
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) throw new Error("missing");
    const payload = decodeAccessToken(auth.slice(7));
    if (payload.type !== "access" || !payload.sub) throw new Error("invalid");
    next();
  } catch {
    res.status(401).json({ error: "Authentication required" });
  }
};
var integrationStatus = (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    ai: { configured: Boolean(serverAiKey()), model: configuredAiModel() },
    openBanking: { status: "requires_provider_approval", provider: "Feezback", documentationUrl: "https://docs.feezback.cloud/docs/introduction-to-open-banking-data" },
    imports: { available: true }
  });
};

// server.ts
var import_cookie_parser = __toESM(require("cookie-parser"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_fs = __toESM(require("fs"), 1);

// server/authRouter.ts
var import_express = require("express");
var import_crypto3 = __toESM(require("crypto"), 1);

// server/googleOAuth.ts
var import_crypto2 = __toESM(require("crypto"), 1);
function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}
function validGoogleState(received, expected) {
  return typeof received === "string" && typeof expected === "string" && /^[a-f0-9]{64}$/.test(received) && /^[a-f0-9]{64}$/.test(expected) && import_crypto2.default.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

// server/database.ts
var import_pg = require("pg");

// server/migrations.ts
var initialSchema = async (db) => {
  await db.query(`CREATE TABLE users (id UUID PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL DEFAULT '', avatar_url TEXT NOT NULL DEFAULT '', google_id TEXT UNIQUE, is_verified BOOLEAN NOT NULL DEFAULT false, token_version INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
  await db.query(`CREATE TABLE user_financial_data (user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data JSONB NOT NULL, revision BIGINT NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
  await db.query("CREATE INDEX user_financial_data_data_idx ON user_financial_data USING GIN (data)");
  await db.query(`CREATE TABLE auth_otp_codes (id UUID PRIMARY KEY, email TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
  await db.query("CREATE INDEX auth_otp_codes_email_idx ON auth_otp_codes(email, expires_at DESC)");
  await db.query(`CREATE TABLE auth_sessions (id TEXT PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE CASCADE, google_subject TEXT NOT NULL, email TEXT NOT NULL, name TEXT, picture TEXT, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
  await db.query("CREATE INDEX auth_sessions_user_idx ON auth_sessions(user_id, expires_at)");
};
var migrations = [{ id: "001_initial", up: initialSchema }];

// server/database.ts
var pool;
function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required. File and memory storage are not supported.");
  return value;
}
function getDatabase() {
  if (!pool) {
    pool = new import_pg.Pool({
      connectionString: databaseUrl(),
      ssl: process.env.DATABASE_SSL === "false" ? false : process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : void 0
    });
  }
  return pool;
}
async function initializeDatabase() {
  await withTransaction(async (client) => {
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
    for (const migration of migrations) {
      const applied = await client.query("SELECT 1 FROM schema_migrations WHERE id = $1", [migration.id]);
      if (!applied.rowCount) {
        await migration.up(client);
        await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [migration.id]);
      }
    }
  });
}
async function withTransaction(work) {
  const client = await getDatabase().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// server/authFileStore.ts
var user = (row) => ({ id: String(row.id), email: String(row.email), name: String(row.name ?? ""), avatarUrl: String(row.avatar_url ?? ""), googleId: String(row.google_id ?? ""), isVerified: Boolean(row.is_verified), tokenVersion: Number(row.token_version), createdAt: new Date(String(row.created_at)).toISOString(), updatedAt: new Date(String(row.updated_at)).toISOString() });
async function findAuthUserByEmail(email) {
  const q = await getDatabase().query("SELECT * FROM users WHERE email = $1", [email.toLowerCase().trim()]);
  return q.rows[0] && user(q.rows[0]);
}
async function findAuthUserById(id) {
  const q = await getDatabase().query("SELECT * FROM users WHERE id = $1", [id]);
  return q.rows[0] && user(q.rows[0]);
}
async function saveAuthUser(value) {
  await getDatabase().query(`INSERT INTO users (id,email,name,avatar_url,google_id,is_verified,token_version,created_at,updated_at) VALUES ($1,$2,$3,$4,NULLIF($5,''),$6,$7,$8,$9)
    ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email,name=EXCLUDED.name,avatar_url=EXCLUDED.avatar_url,google_id=EXCLUDED.google_id,is_verified=EXCLUDED.is_verified,token_version=EXCLUDED.token_version,updated_at=EXCLUDED.updated_at`, [value.id, value.email.toLowerCase(), value.name, value.avatarUrl, value.googleId, value.isVerified, value.tokenVersion, value.createdAt, value.updatedAt]);
}
async function getOrCreateDemoUser() {
  const existing = await findAuthUserByEmail("demo@finance.il");
  if (existing) return existing;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const value = { id: "00000000-0000-4000-8000-000000000001", email: "demo@finance.il", name: "\u05D9\u05E9\u05E8\u05D0\u05DC \u05D9\u05E9\u05E8\u05D0\u05DC\u05D9", avatarUrl: "", googleId: "", isVerified: true, tokenVersion: 0, createdAt: now, updatedAt: now };
  await saveAuthUser(value);
  return value;
}
async function incrementTokenVersion(id) {
  const q = await getDatabase().query("UPDATE users SET token_version=token_version+1,updated_at=now() WHERE id=$1 RETURNING token_version", [id]);
  return Number(q.rows[0]?.token_version ?? 0);
}
async function getRecentOtps(email, windowMs) {
  const q = await getDatabase().query("SELECT * FROM auth_otp_codes WHERE email=$1 AND created_at > now() - ($2 * interval '1 millisecond')", [email, windowMs]);
  return q.rows.map((r) => ({ id: String(r.id), email: String(r.email), code: String(r.code_hash), expiresAt: new Date(String(r.expires_at)).toISOString(), used: Boolean(r.used_at) }));
}
async function saveOtp(r) {
  await getDatabase().query("INSERT INTO auth_otp_codes (id,email,code_hash,expires_at,used_at) VALUES ($1,$2,$3,$4,$5)", [r.id, r.email, r.code, r.expiresAt, r.used ? /* @__PURE__ */ new Date() : null]);
}
async function getUnusedValidOtps(email) {
  const q = await getDatabase().query("SELECT * FROM auth_otp_codes WHERE email=$1 AND used_at IS NULL AND expires_at > now() ORDER BY expires_at DESC", [email]);
  return q.rows.map((r) => ({ id: String(r.id), email: String(r.email), code: String(r.code_hash), expiresAt: new Date(String(r.expires_at)).toISOString(), used: false }));
}
async function markOtpUsed(id) {
  await getDatabase().query("UPDATE auth_otp_codes SET used_at=now() WHERE id=$1 AND used_at IS NULL", [id]);
}

// server/authEmail.ts
var import_nodemailer = __toESM(require("nodemailer"), 1);
async function sendOtpEmail(toEmail, code) {
  const host = process.env.SMTP_HOST;
  const user2 = process.env.SMTP_USER;
  if (!host || !user2) {
    console.warn(`[DEV] OTP for ${toEmail}: ${code}  (SMTP \u05DC\u05D0 \u05DE\u05D5\u05D2\u05D3\u05E8 \u2014 \u05DE\u05D5\u05D3\u05E4\u05E1 \u05DC-log)`);
    return;
  }
  const transporter = import_nodemailer.default.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: { user: user2, pass: process.env.SMTP_PASS || "" }
  });
  const from = process.env.FROM_EMAIL || user2;
  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<body style="margin:0;padding:0;background:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="420" cellpadding="0" cellspacing="0"
             style="background:#0f172a;border:1px solid #1e293b;border-radius:24px;padding:36px">
        <tr><td style="text-align:right">
          <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:20px">
            <span style="font-size:28px">\u{1F48E}</span>
            <span style="color:#10b981;font-size:18px;font-weight:800">FinanceIL</span>
          </div>
          <div style="color:#cbd5e1;font-size:14px;margin-bottom:20px">\u05E7\u05D5\u05D3 \u05D4\u05D0\u05D9\u05DE\u05D5\u05EA \u05E9\u05DC\u05DA:</div>
          <div style="background:#020617;border:1px solid #1e293b;border-radius:12px;
                      padding:20px;text-align:center;margin-bottom:24px;direction:ltr">
            <span style="font-size:38px;font-weight:700;letter-spacing:14px;color:#fff;font-family:monospace">
              ${code}
            </span>
          </div>
          <div style="color:#475569;font-size:12px;line-height:1.6">
            \u05D4\u05E7\u05D5\u05D3 \u05EA\u05E7\u05E3 \u05DC-<strong style="color:#64748b">10 \u05D3\u05E7\u05D5\u05EA</strong>.
            \u05D0\u05DD \u05DC\u05D0 \u05D1\u05D9\u05E7\u05E9\u05EA \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8, \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05EA\u05E2\u05DC\u05DD \u05DE\u05D4\u05D5\u05D3\u05E2\u05D4 \u05D6\u05D5.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  await transporter.sendMail({
    from: `"FinanceIL" <${from}>`,
    to: toEmail,
    subject: "\u05E7\u05D5\u05D3 \u05D4\u05D0\u05D9\u05DE\u05D5\u05EA \u05E9\u05DC\u05DA - FinanceIL",
    text: `\u05E7\u05D5\u05D3 \u05D4\u05D0\u05D9\u05DE\u05D5\u05EA \u05E9\u05DC\u05DA \u05DC-FinanceIL \u05D4\u05D5\u05D0: ${code}

\u05D4\u05E7\u05D5\u05D3 \u05EA\u05E7\u05E3 \u05DC-10 \u05D3\u05E7\u05D5\u05EA.`,
    html
  });
}

// server/authRouter.ts
var authRouter = (0, import_express.Router)();
var COOKIE_NAME = "refresh_token";
var OTP_EXPIRE_MIN = 10;
var OTP_RATE_LIMIT = 3;
var OTP_WINDOW_MIN = 15;
function setCookie(res, token) {
  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS || "30");
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: days * 864e5,
    path: "/auth"
  });
}
function clearCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/auth" });
}
function issueSession(res, user2) {
  const refreshToken = createRefreshToken(user2.id, user2.email, user2.tokenVersion || 0);
  setCookie(res, refreshToken);
  return createAccessToken(user2.id, user2.email);
}
function formatUser(u) {
  return { id: u.id, email: u.email, name: u.name, avatarUrl: u.avatarUrl, isVerified: u.isVerified };
}
function makeUser(partial) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    name: "",
    avatarUrl: "",
    googleId: "",
    isVerified: true,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
    ...partial
  };
}
authRouter.post("/otp/request", async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@") || !email.split("@")[1]?.includes("."))
    return res.status(400).json({ detail: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4" });
  const recent = await getRecentOtps(email, OTP_WINDOW_MIN * 6e4);
  if (recent.length >= OTP_RATE_LIMIT)
    return res.status(429).json({ detail: "\u05D9\u05D5\u05EA\u05E8 \u05DE\u05D3\u05D9 \u05D1\u05E7\u05E9\u05D5\u05EA \u2014 \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 \u05D1\u05E2\u05D5\u05D3 15 \u05D3\u05E7\u05D5\u05EA" });
  const code = generateOtp();
  await saveOtp({
    id: import_crypto3.default.randomUUID(),
    email,
    code: hashOtp(email, code),
    expiresAt: new Date(Date.now() + OTP_EXPIRE_MIN * 6e4).toISOString(),
    used: false
  });
  try {
    await sendOtpEmail(email, code);
  } catch (err) {
    console.error("SMTP error:", err);
    return res.status(502).json({ detail: "\u05E9\u05DC\u05D9\u05D7\u05EA \u05D4\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05E0\u05DB\u05E9\u05DC\u05D4 \u2014 \u05D1\u05D3\u05D5\u05E7 \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA SMTP" });
  }
  return res.json({ message: "\u05E7\u05D5\u05D3 \u05E0\u05E9\u05DC\u05D7" });
});
authRouter.post("/otp/verify", async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const code = (req.body.code || "").trim();
  if (code.length !== 6 || !/^\d+$/.test(code))
    return res.status(400).json({ detail: "\u05E7\u05D5\u05D3 \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA 6 \u05E1\u05E4\u05E8\u05D5\u05EA" });
  const candidates = await getUnusedValidOtps(email);
  const matched = candidates.find((r) => verifyOtp(email, code, r.code));
  if (!matched)
    return res.status(401).json({ detail: "\u05E7\u05D5\u05D3 \u05E9\u05D2\u05D5\u05D9 \u05D0\u05D5 \u05E9\u05E4\u05D2 \u05EA\u05D5\u05E7\u05E4\u05D5" });
  await markOtpUsed(matched.id);
  let user2 = await findAuthUserByEmail(email);
  if (!user2) {
    user2 = makeUser({ id: import_crypto3.default.randomUUID(), email, name: "" });
    await saveAuthUser(user2);
  } else {
    user2 = { ...user2, isVerified: true, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await saveAuthUser(user2);
  }
  const accessToken = issueSession(res, user2);
  return res.json({ access_token: accessToken, user: formatUser(user2) });
});
authRouter.get("/google/status", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  return res.json({ configured: googleConfigured() });
});
authRouter.get("/google", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleConfigured()) return res.status(501).json({ detail: "Google OAuth \u05DC\u05D0 \u05DE\u05D5\u05D2\u05D3\u05E8" });
  const callback = new URL(GOOGLE_REDIRECT_URI());
  if (req.get("host") !== callback.host) return res.redirect(`${callback.origin}/auth/google`);
  const state = import_crypto3.default.randomBytes(32).toString("hex");
  res.cookie("google_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/auth/google", maxAge: 6e5 });
  res.setHeader("Cache-Control", "no-store");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: GOOGLE_REDIRECT_URI(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account"
  });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});
authRouter.get("/google/callback", async (req, res) => {
  const code = req.query.code;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = GOOGLE_REDIRECT_URI();
  const frontendUrl = process.env.FRONTEND_URL || "https://aifina.ai.studio/";
  if (!clientId || !clientSecret) return res.status(501).send("Google OAuth \u05DC\u05D0 \u05DE\u05D5\u05D2\u05D3\u05E8");
  const validState = validGoogleState(req.query.state, req.cookies?.google_oauth_state);
  res.clearCookie("google_oauth_state", { path: "/auth/google" });
  res.setHeader("Cache-Control", "no-store");
  if (!validState || typeof code !== "string" || !code || req.query.error) {
    return res.redirect(`${frontendUrl.replace(/\/$/, "")}/#auth_error=google_failed`);
  }
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }).toString()
    });
    if (!tokenRes.ok) throw new Error("Token exchange failed");
    const tokenData = await tokenRes.json();
    const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    if (!infoRes.ok) throw new Error("User info fetch failed");
    const info = await infoRes.json();
    const email = (info.email || "").toLowerCase().trim();
    if (!email || info.email_verified !== true || typeof info.sub !== "string" || !info.sub) throw new Error("Unverified Google identity");
    let user2 = await findAuthUserByEmail(email);
    if (user2?.googleId && user2.googleId !== info.sub) throw new Error("Google identity mismatch");
    if (!user2) {
      user2 = makeUser({
        id: import_crypto3.default.randomUUID(),
        email,
        name: info.name || "",
        avatarUrl: info.picture || "",
        googleId: info.sub || ""
      });
    } else {
      user2 = {
        ...user2,
        googleId: info.sub || user2.googleId,
        name: info.name || user2.name,
        avatarUrl: info.picture || user2.avatarUrl,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    await saveAuthUser(user2);
    const accessToken = issueSession(res, user2);
    return res.redirect(`${frontendUrl}/#access_token=${accessToken}`);
  } catch (err) {
    console.error("Google OAuth authentication failed");
    return res.redirect(`${process.env.FRONTEND_URL || "https://aifina.ai.studio/"}/#auth_error=google_failed`);
  }
});
authRouter.post("/refresh", async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ detail: "\u05D0\u05D9\u05DF refresh token" });
  try {
    const payload = verifyRefreshToken(token);
    const user2 = await findAuthUserById(payload.sub);
    if (!user2) {
      clearCookie(res);
      return res.status(401).json({ detail: "\u05DE\u05E9\u05EA\u05DE\u05E9 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0" });
    }
    if ((payload.ver ?? 0) !== (user2.tokenVersion || 0)) {
      clearCookie(res);
      return res.status(401).json({ detail: "Token \u05D1\u05D5\u05D8\u05DC \u2014 \u05D9\u05E9 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DE\u05D7\u05D3\u05E9" });
    }
    const accessToken = issueSession(res, user2);
    return res.json({ access_token: accessToken });
  } catch {
    clearCookie(res);
    return res.status(401).json({ detail: "Refresh token \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D0\u05D5 \u05E9\u05E4\u05D2 \u05EA\u05D5\u05E7\u05E4\u05D5" });
  }
});
authRouter.post("/logout", (req, res) => {
  clearCookie(res);
  return res.json({ message: "\u05D4\u05EA\u05E0\u05EA\u05E7\u05EA \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4" });
});
authRouter.post("/logout-all", async (req, res) => {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return res.status(401).json({ detail: "\u05DC\u05D0 \u05DE\u05D0\u05D5\u05DE\u05EA" });
  try {
    const { sub: userId } = decodeAccessToken(auth.slice(7));
    await incrementTokenVersion(userId);
    clearCookie(res);
    return res.json({ message: "\u05D4\u05EA\u05E0\u05EA\u05E7\u05EA \u05DE\u05DB\u05DC \u05D4\u05DE\u05DB\u05E9\u05D9\u05E8\u05D9\u05DD" });
  } catch {
    return res.status(401).json({ detail: "Access token \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF" });
  }
});
authRouter.get("/me", async (req, res) => {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return res.status(401).json({ detail: "\u05DC\u05D0 \u05DE\u05D0\u05D5\u05DE\u05EA" });
  try {
    const { sub: userId } = decodeAccessToken(auth.slice(7));
    const user2 = await findAuthUserById(userId);
    if (!user2) return res.status(404).json({ detail: "\u05DE\u05E9\u05EA\u05DE\u05E9 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0" });
    return res.json(formatUser(user2));
  } catch {
    return res.status(401).json({ detail: "Access token \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF" });
  }
});
authRouter.post("/demo", async (req, res) => {
  const user2 = await getOrCreateDemoUser();
  const accessToken = issueSession(res, user2);
  return res.json({ access_token: accessToken, user: formatUser(user2) });
});

// server/google-oauth-module/config.ts
function required(name) {
  const value = process.env[name];
  if (!value || value.startsWith("replace-with-")) throw new Error("Missing required environment variable: " + name);
  return value;
}
function isGoogleAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
}
function loadGoogleAuthConfig() {
  const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET || "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || (process.env.NODE_ENV === "production" ? "https://aifina.ai.studio/auth/google/callback" : "http://localhost:3000/auth/google/callback");
  return {
    clientId: required("GOOGLE_CLIENT_ID"),
    clientSecret: required("GOOGLE_CLIENT_SECRET"),
    redirectUri,
    sessionSecret,
    appOrigins: (process.env.APP_ORIGINS ?? new URL(redirectUri).origin).split(",").map((value) => value.trim()).filter(Boolean),
    cookieSecure: process.env.COOKIE_SECURE === "true"
  };
}

// server/google-oauth-module/crypto.ts
var import_node_crypto = require("node:crypto");
var randomUrlSafe = (bytes = 32) => (0, import_node_crypto.randomBytes)(bytes).toString("base64url");
var sha256UrlSafe = (value) => (0, import_node_crypto.createHash)("sha256").update(value).digest("base64url");
function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && (0, import_node_crypto.timingSafeEqual)(left, right);
}

// server/google-oauth-module/session-store.ts
var import_crypto5 = __toESM(require("crypto"), 1);
var PostgresSessionStore = class {
  async createPending(value) {
    const id = `pending:${randomUrlSafe()}`;
    await getDatabase().query("INSERT INTO auth_sessions (id,google_subject,email,name,picture,expires_at) VALUES ($1,$2,$3,$4,$5,$6)", [id, value.state, "", JSON.stringify(value), null, new Date(Date.now() + 10 * 6e4)]);
    return id;
  }
  async consumePending(id) {
    const q = await getDatabase().query("DELETE FROM auth_sessions WHERE id=$1 AND expires_at > now() RETURNING name", [id]);
    try {
      return q.rows[0] ? JSON.parse(q.rows[0].name) : void 0;
    } catch {
      return void 0;
    }
  }
  async createSession(value) {
    const db = getDatabase();
    const user2 = await db.query(`INSERT INTO users (id,email,name,avatar_url,google_id,is_verified) VALUES ($1,$2,$3,$4,$5,true)
    ON CONFLICT (google_id) DO UPDATE SET email=EXCLUDED.email,name=EXCLUDED.name,avatar_url=EXCLUDED.avatar_url,is_verified=true,updated_at=now() RETURNING id`, [import_crypto5.default.randomUUID(), value.email.toLowerCase(), value.name ?? "", value.picture ?? "", value.googleSubject]);
    const id = randomUrlSafe();
    await db.query("INSERT INTO auth_sessions (id,user_id,google_subject,email,name,picture,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id, user2.rows[0].id, value.googleSubject, value.email, value.name ?? null, value.picture ?? null, new Date(Date.now() + 7 * 24 * 60 * 6e4)]);
    return id;
  }
  async getSession(id) {
    const q = await getDatabase().query("SELECT user_id,email,name,picture,created_at FROM auth_sessions WHERE id=$1 AND expires_at > now()", [id]);
    const r = q.rows[0];
    return r ? { googleSubject: r.user_id, email: r.email, name: r.name ?? void 0, picture: r.picture ?? void 0, createdAt: new Date(r.created_at).getTime() } : void 0;
  }
  async deleteSession(id) {
    await getDatabase().query("DELETE FROM auth_sessions WHERE id=$1", [id]);
  }
};

// server/google-oauth-module/google-auth.ts
var import_google_auth_library = require("google-auth-library");
var GoogleAuthService = class {
  constructor(config, store, client = new import_google_auth_library.OAuth2Client(config.clientId, config.clientSecret, config.redirectUri)) {
    this.config = config;
    this.store = store;
    this.client = client;
  }
  async begin(returnTo) {
    const state = randomUrlSafe();
    const nonce = randomUrlSafe();
    const codeVerifier = randomUrlSafe(64);
    const pending = { state, nonce, codeVerifier, createdAt: Date.now(), returnTo };
    const pendingId = await this.store.createPending(pending);
    return {
      pendingId,
      url: this.client.generateAuthUrl({
        access_type: "offline",
        response_type: "code",
        scope: ["openid", "email", "profile"],
        state,
        nonce,
        code_challenge: sha256UrlSafe(codeVerifier),
        code_challenge_method: import_google_auth_library.CodeChallengeMethod.S256,
        prompt: "select_account"
      })
    };
  }
  async complete(pendingId, state, code) {
    if (!pendingId || !state || !code) throw new Error("Invalid OAuth callback");
    const pending = await this.store.consumePending(pendingId);
    if (!pending || Date.now() - pending.createdAt > 10 * 6e4 || !safeEqual(pending.state, state)) {
      throw new Error("OAuth state validation failed");
    }
    const tokens = await this.client.getToken({ code, codeVerifier: pending.codeVerifier });
    if (!tokens.tokens.id_token) throw new Error("Google did not return an ID token");
    const payload = (await this.client.verifyIdToken({ idToken: tokens.tokens.id_token, audience: this.config.clientId })).getPayload();
    if (!payload || payload.nonce !== pending.nonce || payload.email_verified !== true || typeof payload.sub !== "string" || typeof payload.email !== "string") {
      throw new Error("Google identity token validation failed");
    }
    const user2 = {
      googleSubject: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : void 0,
      picture: typeof payload.picture === "string" ? payload.picture : void 0,
      createdAt: Date.now()
    };
    return { sessionId: await this.store.createSession(user2), user: user2, returnTo: pending.returnTo };
  }
};

// server/google-oauth-module/routes.ts
var import_express2 = require("express");
var cookieOptions = (secure) => ({ httpOnly: true, secure, sameSite: "lax", path: "/" });
var cookieNames = (secure) => ({
  pending: secure ? "__Host-google_oauth_pending" : "google_oauth_pending",
  session: secure ? "__Host-app_session" : "app_session"
});
function cookie(req, name) {
  return req.headers.cookie?.split(";").map((value) => value.trim()).find((value) => value.startsWith(name + "="))?.slice(name.length + 1);
}
function safeReturnTo(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
function googleAuthRouter(config, store, auth = new GoogleAuthService(config, store)) {
  const router2 = (0, import_express2.Router)();
  const names = cookieNames(config.cookieSecure);
  router2.get("/google/start", async (req, res) => {
    const { pendingId, url } = await auth.begin(safeReturnTo(req.query.returnTo));
    res.cookie(names.pending, pendingId, { ...cookieOptions(config.cookieSecure), maxAge: 10 * 6e4 });
    res.redirect(url);
  });
  router2.get("/google/callback", async (req, res) => {
    try {
      if (typeof req.query.error === "string") throw new Error("Google authorization was declined");
      const result = await auth.complete(
        cookie(req, names.pending),
        typeof req.query.state === "string" ? req.query.state : void 0,
        typeof req.query.code === "string" ? req.query.code : void 0
      );
      res.clearCookie(names.pending, cookieOptions(config.cookieSecure));
      res.cookie(names.session, result.sessionId, { ...cookieOptions(config.cookieSecure), maxAge: 7 * 24 * 60 * 6e4 });
      res.redirect(result.returnTo);
    } catch {
      res.clearCookie(names.pending, cookieOptions(config.cookieSecure));
      res.redirect("/login?error=google_sign_in_failed");
    }
  });
  router2.get("/session", async (req, res) => {
    const current = await store.getSession(cookie(req, names.session) ?? "");
    res.json({ user: current ?? null });
  });
  router2.post("/logout", async (req, res) => {
    const origin = req.get("origin");
    if (origin && !config.appOrigins.includes(origin)) return res.sendStatus(403);
    const id = cookie(req, names.session);
    if (id) await store.deleteSession(id);
    res.clearCookie(names.session, cookieOptions(config.cookieSecure));
    return res.sendStatus(204);
  });
  return router2;
}

// server/scraperProxy.ts
var import_express3 = require("express");
var router = (0, import_express3.Router)();
var SCRAPER_URL = process.env.SCRAPER_URL ?? "http://localhost:3001";
var SCRAPER_INTERNAL_KEY = process.env.SCRAPER_INTERNAL_KEY ?? "";
router.all("*", async (req, res) => {
  const qs = Object.keys(req.query).length ? "?" + new URLSearchParams(req.query).toString() : "";
  const targetUrl = `${SCRAPER_URL}/api${req.path}${qs}`;
  try {
    const options = {
      method: req.method,
      headers: {
        "X-Internal-Key": SCRAPER_INTERNAL_KEY,
        "Content-Type": "application/json"
      }
    };
    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      options.body = JSON.stringify(req.body);
    }
    const upstream = await fetch(targetUrl, options);
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    const isDown = err?.cause?.code === "ECONNREFUSED";
    res.status(503).json({
      success: false,
      error: {
        code: "SCRAPER_UNAVAILABLE",
        message: isDown ? "\u05E9\u05D9\u05E8\u05D5\u05EA \u05D9\u05D9\u05D1\u05D5\u05D0 \u05D4\u05D1\u05E0\u05E7 \u05D0\u05D9\u05E0\u05D5 \u05D6\u05DE\u05D9\u05DF. \u05D4\u05E4\u05E2\u05DC \u05D0\u05D5\u05EA\u05D5 \u05E2\u05DD: cd finance-scraper && npm run dev" : String(err)
      }
    });
  }
});

// server/fundsApi.ts
var STOCK_MONTHLY_2024 = [1.6, 5.2, 3.1, -4.2, 4.8, 3.5, 1.1, 2.3, 2, -0.9, 5.7, -2.4];
var BALANCED_MONTHLY_2024 = [1.1, 3.4, 2.1, -2.8, 3.1, 2.4, 0.8, 1.5, 1.4, -0.5, 3.8, -1.5];
var BONDS_MONTHLY_2024 = [0.4, 1.2, 0.8, -1.1, 0.9, 0.7, 0.3, 0.6, 0.5, 0.1, 1.2, -0.4];
var INDEX_MONTHLY_2024 = [1.7, 5.3, 3.2, -4.3, 4.9, 3.6, 1.2, 2.4, 2.1, -0.8, 5.9, -2.5];
function makeMonthly(returns, yearOffset = 0) {
  const year = 2024 - yearOffset;
  return returns.map((r, i) => ({
    month: `${year}-${String(i + 1).padStart(2, "0")}`,
    returnPct: parseFloat(r.toFixed(2))
  }));
}
function ytd(returns) {
  const compound = returns.reduce((acc, r) => acc * (1 + r / 100), 1);
  return parseFloat(((compound - 1) * 100).toFixed(1));
}
var STATIC_FUNDS = [
  // ── הראל ──────────────────────────────────────────────────────────────────
  {
    id: "harel-pension-stocks",
    name: "\u05D4\u05E8\u05D0\u05DC \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05D4\u05E8\u05D0\u05DC",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024),
    threeYearAvg: 9.2,
    fiveYearAvg: 10.1,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024),
    source: "static"
  },
  {
    id: "harel-pension-general",
    name: "\u05D4\u05E8\u05D0\u05DC \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DB\u05DC\u05DC\u05D9",
    company: "\u05D4\u05E8\u05D0\u05DC",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DB\u05DC\u05DC\u05D9",
    ytdReturn: ytd(BALANCED_MONTHLY_2024),
    threeYearAvg: 6.8,
    fiveYearAvg: 7.4,
    monthlyReturns: makeMonthly(BALANCED_MONTHLY_2024),
    source: "static"
  },
  {
    id: "harel-pension-index",
    name: "\u05D4\u05E8\u05D0\u05DC \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05D7\u05E7\u05D4 \u05DE\u05D3\u05D3",
    company: "\u05D4\u05E8\u05D0\u05DC",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05D7\u05E7\u05D4 \u05DE\u05D3\u05D3",
    ytdReturn: ytd(INDEX_MONTHLY_2024),
    threeYearAvg: 9.5,
    fiveYearAvg: 10.3,
    monthlyReturns: makeMonthly(INDEX_MONTHLY_2024),
    source: "static"
  },
  {
    id: "harel-keren-stocks",
    name: "\u05D4\u05E8\u05D0\u05DC \u05E7\u05E8\u05DF \u05D4\u05E9\u05EA\u05DC\u05DE\u05D5\u05EA - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05D4\u05E8\u05D0\u05DC",
    type: "keren",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024),
    threeYearAvg: 9,
    fiveYearAvg: 9.8,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024),
    source: "static"
  },
  {
    id: "harel-keren-general",
    name: "\u05D4\u05E8\u05D0\u05DC \u05E7\u05E8\u05DF \u05D4\u05E9\u05EA\u05DC\u05DE\u05D5\u05EA - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DB\u05DC\u05DC\u05D9",
    company: "\u05D4\u05E8\u05D0\u05DC",
    type: "keren",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DB\u05DC\u05DC\u05D9",
    ytdReturn: ytd(BALANCED_MONTHLY_2024),
    threeYearAvg: 6.5,
    fiveYearAvg: 7.2,
    monthlyReturns: makeMonthly(BALANCED_MONTHLY_2024),
    source: "static"
  },
  // ── מנורה מבטחים ──────────────────────────────────────────────────────────
  {
    id: "menora-pension-stocks",
    name: "\u05DE\u05E0\u05D5\u05E8\u05D4 \u05DE\u05D1\u05D8\u05D7\u05D9\u05DD \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05DE\u05E0\u05D5\u05E8\u05D4 \u05DE\u05D1\u05D8\u05D7\u05D9\u05DD",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024.map((r) => r * 0.97)),
    threeYearAvg: 8.9,
    fiveYearAvg: 9.7,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map((r) => r * 0.97)),
    source: "static"
  },
  {
    id: "menora-pension-general",
    name: "\u05DE\u05E0\u05D5\u05E8\u05D4 \u05DE\u05D1\u05D8\u05D7\u05D9\u05DD \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DB\u05DC\u05DC\u05D9",
    company: "\u05DE\u05E0\u05D5\u05E8\u05D4 \u05DE\u05D1\u05D8\u05D7\u05D9\u05DD",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DB\u05DC\u05DC\u05D9",
    ytdReturn: ytd(BALANCED_MONTHLY_2024),
    threeYearAvg: 6.7,
    fiveYearAvg: 7.3,
    monthlyReturns: makeMonthly(BALANCED_MONTHLY_2024),
    source: "static"
  },
  {
    id: "menora-keren-stocks",
    name: "\u05DE\u05E0\u05D5\u05E8\u05D4 \u05E7\u05E8\u05DF \u05D4\u05E9\u05EA\u05DC\u05DE\u05D5\u05EA - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05DE\u05E0\u05D5\u05E8\u05D4 \u05DE\u05D1\u05D8\u05D7\u05D9\u05DD",
    type: "keren",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024.map((r) => r * 0.96)),
    threeYearAvg: 8.7,
    fiveYearAvg: 9.5,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map((r) => r * 0.96)),
    source: "static"
  },
  {
    id: "menora-keren-general",
    name: "\u05DE\u05E0\u05D5\u05E8\u05D4 \u05E7\u05E8\u05DF \u05D4\u05E9\u05EA\u05DC\u05DE\u05D5\u05EA - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DB\u05DC\u05DC\u05D9",
    company: "\u05DE\u05E0\u05D5\u05E8\u05D4 \u05DE\u05D1\u05D8\u05D7\u05D9\u05DD",
    type: "keren",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DB\u05DC\u05DC\u05D9",
    ytdReturn: ytd(BALANCED_MONTHLY_2024.map((r) => r * 0.97)),
    threeYearAvg: 6.4,
    fiveYearAvg: 7,
    monthlyReturns: makeMonthly(BALANCED_MONTHLY_2024.map((r) => r * 0.97)),
    source: "static"
  },
  // ── מגדל ──────────────────────────────────────────────────────────────────
  {
    id: "migdal-pension-stocks",
    name: "\u05DE\u05D2\u05D3\u05DC \u05DE\u05E7\u05E4\u05EA \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05DE\u05D2\u05D3\u05DC",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024.map((r) => r * 0.95)),
    threeYearAvg: 8.6,
    fiveYearAvg: 9.4,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map((r) => r * 0.95)),
    source: "static"
  },
  {
    id: "migdal-pension-general",
    name: "\u05DE\u05D2\u05D3\u05DC \u05DE\u05E7\u05E4\u05EA \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DB\u05DC\u05DC\u05D9",
    company: "\u05DE\u05D2\u05D3\u05DC",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DB\u05DC\u05DC\u05D9",
    ytdReturn: ytd(BALANCED_MONTHLY_2024.map((r) => r * 0.96)),
    threeYearAvg: 6.5,
    fiveYearAvg: 7.1,
    monthlyReturns: makeMonthly(BALANCED_MONTHLY_2024.map((r) => r * 0.96)),
    source: "static"
  },
  {
    id: "migdal-keren-stocks",
    name: "\u05DE\u05D2\u05D3\u05DC \u05E7\u05E8\u05DF \u05D4\u05E9\u05EA\u05DC\u05DE\u05D5\u05EA - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05DE\u05D2\u05D3\u05DC",
    type: "keren",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024.map((r) => r * 0.95)),
    threeYearAvg: 8.5,
    fiveYearAvg: 9.2,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map((r) => r * 0.95)),
    source: "static"
  },
  // ── כלל ───────────────────────────────────────────────────────────────────
  {
    id: "clal-pension-stocks",
    name: "\u05DB\u05DC\u05DC \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05DB\u05DC\u05DC",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024.map((r) => r * 0.98)),
    threeYearAvg: 9,
    fiveYearAvg: 9.8,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map((r) => r * 0.98)),
    source: "static"
  },
  {
    id: "clal-pension-general",
    name: "\u05DB\u05DC\u05DC \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DB\u05DC\u05DC\u05D9",
    company: "\u05DB\u05DC\u05DC",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DB\u05DC\u05DC\u05D9",
    ytdReturn: ytd(BALANCED_MONTHLY_2024.map((r) => r * 0.98)),
    threeYearAvg: 6.6,
    fiveYearAvg: 7.2,
    monthlyReturns: makeMonthly(BALANCED_MONTHLY_2024.map((r) => r * 0.98)),
    source: "static"
  },
  {
    id: "clal-keren-stocks",
    name: "\u05DB\u05DC\u05DC \u05E7\u05E8\u05DF \u05D4\u05E9\u05EA\u05DC\u05DE\u05D5\u05EA - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05DB\u05DC\u05DC",
    type: "keren",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024.map((r) => r * 0.97)),
    threeYearAvg: 8.8,
    fiveYearAvg: 9.6,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map((r) => r * 0.97)),
    source: "static"
  },
  {
    id: "clal-keren-general",
    name: "\u05DB\u05DC\u05DC \u05E7\u05E8\u05DF \u05D4\u05E9\u05EA\u05DC\u05DE\u05D5\u05EA - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DB\u05DC\u05DC\u05D9",
    company: "\u05DB\u05DC\u05DC",
    type: "keren",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DB\u05DC\u05DC\u05D9",
    ytdReturn: ytd(BALANCED_MONTHLY_2024.map((r) => r * 0.97)),
    threeYearAvg: 6.3,
    fiveYearAvg: 7,
    monthlyReturns: makeMonthly(BALANCED_MONTHLY_2024.map((r) => r * 0.97)),
    source: "static"
  },
  // ── אינפיניטי ─────────────────────────────────────────────────────────────
  {
    id: "infinity-pension-stocks",
    name: "\u05D0\u05D9\u05E0\u05E4\u05D9\u05E0\u05D9\u05D8\u05D9 \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05D0\u05D9\u05E0\u05E4\u05D9\u05E0\u05D9\u05D8\u05D9",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024.map((r) => r * 1.01)),
    threeYearAvg: 9.3,
    fiveYearAvg: 10.2,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map((r) => r * 1.01)),
    source: "static"
  },
  {
    id: "infinity-pension-index",
    name: "\u05D0\u05D9\u05E0\u05E4\u05D9\u05E0\u05D9\u05D8\u05D9 \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05D7\u05E7\u05D4 \u05DE\u05D3\u05D3",
    company: "\u05D0\u05D9\u05E0\u05E4\u05D9\u05E0\u05D9\u05D8\u05D9",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05D7\u05E7\u05D4 \u05DE\u05D3\u05D3",
    ytdReturn: ytd(INDEX_MONTHLY_2024),
    threeYearAvg: 9.6,
    fiveYearAvg: 10.4,
    monthlyReturns: makeMonthly(INDEX_MONTHLY_2024),
    source: "static"
  },
  {
    id: "infinity-keren-stocks",
    name: "\u05D0\u05D9\u05E0\u05E4\u05D9\u05E0\u05D9\u05D8\u05D9 \u05E7\u05E8\u05DF \u05D4\u05E9\u05EA\u05DC\u05DE\u05D5\u05EA - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05D0\u05D9\u05E0\u05E4\u05D9\u05E0\u05D9\u05D8\u05D9",
    type: "keren",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024.map((r) => r * 1.01)),
    threeYearAvg: 9.1,
    fiveYearAvg: 10,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map((r) => r * 1.01)),
    source: "static"
  },
  {
    id: "infinity-keren-index",
    name: "\u05D0\u05D9\u05E0\u05E4\u05D9\u05E0\u05D9\u05D8\u05D9 \u05E7\u05E8\u05DF \u05D4\u05E9\u05EA\u05DC\u05DE\u05D5\u05EA - \u05DE\u05D7\u05E7\u05D4 \u05DE\u05D3\u05D3",
    company: "\u05D0\u05D9\u05E0\u05E4\u05D9\u05E0\u05D9\u05D8\u05D9",
    type: "keren",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05D7\u05E7\u05D4 \u05DE\u05D3\u05D3",
    ytdReturn: ytd(INDEX_MONTHLY_2024),
    threeYearAvg: 9.4,
    fiveYearAvg: 10.2,
    monthlyReturns: makeMonthly(INDEX_MONTHLY_2024),
    source: "static"
  },
  // ── מיטב-דש ───────────────────────────────────────────────────────────────
  {
    id: "meitav-pension-stocks",
    name: "\u05DE\u05D9\u05D8\u05D1-\u05D3\u05E9 \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05DE\u05D9\u05D8\u05D1-\u05D3\u05E9",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024.map((r) => r * 0.99)),
    threeYearAvg: 9.1,
    fiveYearAvg: 9.9,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map((r) => r * 0.99)),
    source: "static"
  },
  {
    id: "meitav-pension-general",
    name: "\u05DE\u05D9\u05D8\u05D1-\u05D3\u05E9 \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DB\u05DC\u05DC\u05D9",
    company: "\u05DE\u05D9\u05D8\u05D1-\u05D3\u05E9",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DB\u05DC\u05DC\u05D9",
    ytdReturn: ytd(BALANCED_MONTHLY_2024),
    threeYearAvg: 6.7,
    fiveYearAvg: 7.3,
    monthlyReturns: makeMonthly(BALANCED_MONTHLY_2024),
    source: "static"
  },
  {
    id: "meitav-keren-stocks",
    name: "\u05DE\u05D9\u05D8\u05D1-\u05D3\u05E9 \u05E7\u05E8\u05DF \u05D4\u05E9\u05EA\u05DC\u05DE\u05D5\u05EA - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05DE\u05D9\u05D8\u05D1-\u05D3\u05E9",
    type: "keren",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024.map((r) => r * 0.99)),
    threeYearAvg: 9,
    fiveYearAvg: 9.7,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map((r) => r * 0.99)),
    source: "static"
  },
  // ── פסגות ─────────────────────────────────────────────────────────────────
  {
    id: "psagot-pension-stocks",
    name: "\u05E4\u05E1\u05D2\u05D5\u05EA \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05E4\u05E1\u05D2\u05D5\u05EA",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024.map((r) => r * 0.96)),
    threeYearAvg: 8.7,
    fiveYearAvg: 9.5,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map((r) => r * 0.96)),
    source: "static"
  },
  {
    id: "psagot-keren-stocks",
    name: "\u05E4\u05E1\u05D2\u05D5\u05EA \u05E7\u05E8\u05DF \u05D4\u05E9\u05EA\u05DC\u05DE\u05D5\u05EA - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05E4\u05E1\u05D2\u05D5\u05EA",
    type: "keren",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024.map((r) => r * 0.96)),
    threeYearAvg: 8.5,
    fiveYearAvg: 9.3,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map((r) => r * 0.96)),
    source: "static"
  },
  // ── אלטשולר שחם ───────────────────────────────────────────────────────────
  {
    id: "altshul-pension-stocks",
    name: "\u05D0\u05DC\u05D8\u05E9\u05D5\u05DC\u05E8 \u05E9\u05D7\u05DD \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05D0\u05DC\u05D8\u05E9\u05D5\u05DC\u05E8 \u05E9\u05D7\u05DD",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024.map((r) => r * 0.98)),
    threeYearAvg: 8.9,
    fiveYearAvg: 9.8,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map((r) => r * 0.98)),
    source: "static"
  },
  {
    id: "altshul-keren-stocks",
    name: "\u05D0\u05DC\u05D8\u05E9\u05D5\u05DC\u05E8 \u05E9\u05D7\u05DD \u05E7\u05E8\u05DF \u05D4\u05E9\u05EA\u05DC\u05DE\u05D5\u05EA - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05D0\u05DC\u05D8\u05E9\u05D5\u05DC\u05E8 \u05E9\u05D7\u05DD",
    type: "keren",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024.map((r) => r * 1.02)),
    threeYearAvg: 9.2,
    fiveYearAvg: 10,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map((r) => r * 1.02)),
    source: "static"
  },
  // ── אנליסט ────────────────────────────────────────────────────────────────
  {
    id: "analyst-pension-stocks",
    name: "\u05D0\u05E0\u05DC\u05D9\u05E1\u05D8 \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05D0\u05E0\u05DC\u05D9\u05E1\u05D8",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024.map((r) => r * 0.97)),
    threeYearAvg: 8.8,
    fiveYearAvg: 9.6,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map((r) => r * 0.97)),
    source: "static"
  },
  {
    id: "analyst-keren-stocks",
    name: "\u05D0\u05E0\u05DC\u05D9\u05E1\u05D8 \u05E7\u05E8\u05DF \u05D4\u05E9\u05EA\u05DC\u05DE\u05D5\u05EA - \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    company: "\u05D0\u05E0\u05DC\u05D9\u05E1\u05D8",
    type: "keren",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA",
    ytdReturn: ytd(STOCK_MONTHLY_2024.map((r) => r * 0.97)),
    threeYearAvg: 8.6,
    fiveYearAvg: 9.4,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map((r) => r * 0.97)),
    source: "static"
  },
  // ── אגח / שמרני (cross-company) ────────────────────────────────────────────
  {
    id: "harel-pension-bonds",
    name: "\u05D4\u05E8\u05D0\u05DC \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05D0\u05D2\u05D7",
    company: "\u05D4\u05E8\u05D0\u05DC",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05D0\u05D2\u05D7",
    ytdReturn: ytd(BONDS_MONTHLY_2024),
    threeYearAvg: 3.8,
    fiveYearAvg: 4.2,
    monthlyReturns: makeMonthly(BONDS_MONTHLY_2024),
    source: "static"
  },
  {
    id: "menora-pension-bonds",
    name: "\u05DE\u05E0\u05D5\u05E8\u05D4 \u05DE\u05D1\u05D8\u05D7\u05D9\u05DD \u05E4\u05E0\u05E1\u05D9\u05D4 - \u05DE\u05E1\u05DC\u05D5\u05DC \u05D0\u05D2\u05D7",
    company: "\u05DE\u05E0\u05D5\u05E8\u05D4 \u05DE\u05D1\u05D8\u05D7\u05D9\u05DD",
    type: "pension",
    track: "\u05DE\u05E1\u05DC\u05D5\u05DC \u05D0\u05D2\u05D7",
    ytdReturn: ytd(BONDS_MONTHLY_2024),
    threeYearAvg: 3.6,
    fiveYearAvg: 4,
    monthlyReturns: makeMonthly(BONDS_MONTHLY_2024),
    source: "static"
  }
];
async function tryLiveSearch(query, type) {
  try {
    const encodedQ = encodeURIComponent(query);
    const fundType = type === "pension" ? "pension" : "gemel";
    const res = await fetch(
      `https://www.gov.il/api/mof/pension-comparison/funds?q=${encodedQ}&type=${fundType}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(4e3) }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.funds) && data.funds.length > 0) {
        return data.funds.map((f) => ({
          id: String(f.id || f.fundId),
          name: f.name || f.fundName,
          company: f.company || f.managingCompany,
          type,
          track: f.track || f.trackName || "",
          ytdReturn: parseFloat(f.ytdReturn || f.yieldYTD || 0),
          threeYearAvg: parseFloat(f.threeYear || f.yield3Y || 0),
          fiveYearAvg: parseFloat(f.fiveYear || f.yield5Y || 0),
          monthlyReturns: (f.monthlyReturns || []).map((m) => ({
            month: m.month || m.date,
            returnPct: parseFloat(m.return || m.yield || 0)
          })),
          source: "live"
        }));
      }
    }
  } catch {
  }
  return null;
}
async function searchFunds(query, type) {
  if (!query.trim()) return [];
  const live = await tryLiveSearch(query, type);
  if (live && live.length > 0) return live;
  const q = query.toLowerCase();
  return STATIC_FUNDS.filter(
    (f) => f.type === type && (f.name.toLowerCase().includes(q) || f.company.toLowerCase().includes(q) || f.track.toLowerCase().includes(q))
  );
}
async function getFundById(id) {
  return STATIC_FUNDS.find((f) => f.id === id) || null;
}
function getAllFunds(type) {
  return type ? STATIC_FUNDS.filter((f) => f.type === type) : STATIC_FUNDS;
}

// server/userDataStore.ts
async function loadUserData(userId) {
  const result = await getDatabase().query("SELECT data, revision FROM user_financial_data WHERE user_id = $1", [userId]);
  return result.rows[0] && { data: result.rows[0].data, revision: Number(result.rows[0].revision) };
}
var RevisionConflictError = class extends Error {
};
async function saveUserData(userId, data, expectedRevision) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid financial data payload");
  const result = await getDatabase().query(`INSERT INTO user_financial_data (user_id, data, revision) VALUES ($1, $2::jsonb, 1)
    ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, revision = user_financial_data.revision + 1, updated_at = now()
    WHERE user_financial_data.revision = $3 RETURNING revision`, [userId, JSON.stringify(data), expectedRevision]);
  if (!result.rowCount) throw new RevisionConflictError("Financial data was changed on another device");
  return Number(result.rows[0].revision);
}
async function deleteUserAccount(userId) {
  return withTransaction(async (client) => (await client.query("DELETE FROM users WHERE id = $1", [userId])).rowCount === 1);
}

// server.ts
import_dotenv.default.config();
var googleSessionStore = null;
var DATA_DIR = import_path.default.join(process.cwd(), "data");
if (!import_fs.default.existsSync(DATA_DIR)) {
  import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
}
var USERS_FILE = import_path.default.join(DATA_DIR, "users.json");
async function startServer() {
  await initializeDatabase();
  const app = (0, import_express4.default)();
  const PORT = 3e3;
  app.use(import_express4.default.json({ limit: "20mb" }));
  app.use((0, import_cookie_parser.default)());
  if (isGoogleAuthConfigured()) {
    googleSessionStore = new PostgresSessionStore();
    app.use("/auth", googleAuthRouter(loadGoogleAuthConfig(), googleSessionStore));
  }
  app.get("/auth/google/status", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ configured: isGoogleAuthConfigured() });
  });
  app.use("/auth", authRouter);
  app.get("/api/integrations/status", integrationAuth, integrationStatus);
  if (process.env.ENABLE_FINANCE_SCRAPER === "true") app.use("/api/scraper", router);
  app.use(async (req, res, next) => {
    const googleCookie = process.env.COOKIE_SECURE === "true" ? "__Host-app_session" : "app_session";
    const googleSession = await googleSessionStore?.getSession(req.cookies?.[googleCookie] || "");
    if (googleSession) {
      req.userId = googleSession.googleSubject;
      req.userEmail = googleSession.email;
      return next();
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) return next();
    if (!req.path.startsWith("/api/")) return next();
    const pub = ["/api/health", "/api/forex", "/api/market-summary", "/api/stock-quote", "/api/categorize", "/api/funds"];
    if (pub.some((p) => req.path.startsWith(p))) return next();
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) return res.status(401).json({ detail: "\u05DC\u05D0 \u05DE\u05D0\u05D5\u05DE\u05EA" });
    try {
      const payload = decodeAccessToken(auth.slice(7));
      if (!await findAuthUserById(payload.sub)) return res.status(401).json({ detail: "\u05DE\u05E9\u05EA\u05DE\u05E9 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0" });
      req.userId = payload.sub;
      req.userEmail = payload.email;
      next();
    } catch {
      return res.status(401).json({ detail: "Token \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D0\u05D5 \u05E9\u05E4\u05D2 \u05EA\u05D5\u05E7\u05E4\u05D5" });
    }
  });
  const requireAppAuth = (req, res, next) => {
    if (req.userId) return next();
    return res.status(401).json({ detail: "\u05DC\u05D0 \u05DE\u05D0\u05D5\u05DE\u05EA" });
  };
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/api/parse-statement", async (req, res) => {
    try {
      const apiKey = getGeminiApiKey(req);
      if (!apiKey) return res.status(400).json({ error: "\u05DE\u05E4\u05EA\u05D7 Gemini \u05D7\u05E1\u05E8" });
      const { content } = req.body;
      if (!content || typeof content !== "string")
        return res.status(400).json({ error: "\u05EA\u05D5\u05DB\u05DF \u05E7\u05D5\u05D1\u05E5 \u05D7\u05E1\u05E8" });
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const CAT_META = {
        "\u05D4\u05DB\u05E0\u05E1\u05D4": { color: "#10B981", emoji: "\u{1F4B0}" },
        "\u05DE\u05D6\u05D5\u05DF \u05D5\u05E9\u05D5\u05E7": { color: "#22C55E", emoji: "\u{1F6D2}" },
        "\u05D3\u05D9\u05D5\u05E8": { color: "#64748B", emoji: "\u{1F3E0}" },
        "\u05EA\u05D7\u05D1\u05D5\u05E8\u05D4": { color: "#3B82F6", emoji: "\u{1F68C}" },
        "\u05D7\u05E9\u05D1\u05D5\u05E0\u05D5\u05EA": { color: "#EAB308", emoji: "\u{1F4A1}" },
        "\u05D1\u05E8\u05D9\u05D0\u05D5\u05EA": { color: "#14B8A6", emoji: "\u{1F3E5}" },
        "\u05D1\u05D9\u05D3\u05D5\u05E8": { color: "#EC4899", emoji: "\u{1F3AC}" },
        "\u05E7\u05E0\u05D9\u05D5\u05EA": { color: "#F59E0B", emoji: "\u{1F6CD}\uFE0F" },
        "\u05D7\u05D9\u05E1\u05DB\u05D5\u05DF": { color: "#8B5CF6", emoji: "\u{1F48E}" },
        "\u05E9\u05D5\u05E0\u05D5\u05EA": { color: "#9CA3AF", emoji: "\u{1F4E6}" }
      };
      const VALID_CATS = Object.keys(CAT_META);
      const prompt = `\u05D0\u05EA\u05D4 \u05DE\u05D5\u05DE\u05D7\u05D4 \u05D1\u05E0\u05D9\u05EA\u05D5\u05D7 \u05D3\u05E4\u05D9 \u05D7\u05E9\u05D1\u05D5\u05DF \u05D1\u05E0\u05E7 \u05D5\u05DB\u05E8\u05D8\u05D9\u05E1\u05D9 \u05D0\u05E9\u05E8\u05D0\u05D9 \u05D9\u05E9\u05E8\u05D0\u05DC\u05D9\u05D9\u05DD.

\u05DC\u05D4\u05DC\u05DF \u05EA\u05D5\u05DB\u05DF \u05E7\u05D5\u05D1\u05E5 CSV/Excel \u05E9\u05DC \u05D3\u05E3 \u05D7\u05E9\u05D1\u05D5\u05DF:
---
${content.slice(0, 9e3)}
---

\u05DE\u05E9\u05D9\u05DE\u05D4: \u05D7\u05DC\u05E5 \u05D0\u05EA \u05DB\u05DC \u05E9\u05D5\u05E8\u05D5\u05EA \u05D4\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05D1\u05DC\u05D1\u05D3. \u05D4\u05EA\u05E2\u05DC\u05DD \u05DE\u05DB\u05D5\u05EA\u05E8\u05D5\u05EA, \u05E1\u05D9\u05DB\u05D5\u05DE\u05D9\u05DD \u05D5\u05DE\u05D9\u05D3\u05E2 \u05DB\u05DC\u05DC\u05D9.
\u05DC\u05DB\u05DC \u05E2\u05E1\u05E7\u05D4 \u05D4\u05D7\u05D6\u05E8:
- date: \u05EA\u05D0\u05E8\u05D9\u05DA \u05D1\u05E4\u05D5\u05E8\u05DE\u05D8 YYYY-MM-DD (\u05E9\u05E0\u05D4 2 \u05E1\u05E4\u05E8\u05D5\u05EA \u2192 \u05D4\u05E0\u05D7 20XX)
- description: \u05E9\u05DD \u05D1\u05D9\u05EA \u05D4\u05E2\u05E1\u05E7 / \u05EA\u05D9\u05D0\u05D5\u05E8 \u05D4\u05E4\u05E2\u05D5\u05DC\u05D4 (\u05DC\u05D0 \u05EA\u05D0\u05E8\u05D9\u05DA, \u05DC\u05D0 \u05DE\u05E1\u05E4\u05E8)
- amount: \u05D4\u05E1\u05DB\u05D5\u05DD \u05DB\u05DE\u05E1\u05E4\u05E8 \u05D7\u05D9\u05D5\u05D1\u05D9
- type: "expense" \u05E2\u05D1\u05D5\u05E8 \u05D7\u05D9\u05D5\u05D1/\u05D4\u05D5\u05E6\u05D0\u05D4, "income" \u05E2\u05D1\u05D5\u05E8 \u05D6\u05D9\u05DB\u05D5\u05D9/\u05D4\u05DB\u05E0\u05E1\u05D4
- cat: \u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4 \u05D0\u05D7\u05EA \u05D1\u05DC\u05D1\u05D3 \u05DE\u05D4\u05E8\u05E9\u05D9\u05DE\u05D4: ${VALID_CATS.join(" | ")}

\u05DB\u05DC\u05DC\u05D9\u05DD:
- \u05D0\u05DD \u05D9\u05E9 \u05E9\u05EA\u05D9 \u05E2\u05DE\u05D5\u05D3\u05D5\u05EA \u05EA\u05D0\u05E8\u05D9\u05DA (\u05E2\u05E1\u05E7\u05D4 + \u05D7\u05D9\u05D5\u05D1) \u2014 \u05E7\u05D7 \u05D0\u05EA \u05EA\u05D0\u05E8\u05D9\u05DA \u05D4\u05E2\u05E1\u05E7\u05D4
- \u05D0\u05DD \u05D4\u05E1\u05DB\u05D5\u05DD \u05E9\u05DC\u05D9\u05DC\u05D9 \u05D1\u05E7\u05D5\u05D1\u05E5 \u2192 type="expense"
- \u05D0\u05DD \u05D4\u05E1\u05DB\u05D5\u05DD \u05D7\u05D9\u05D5\u05D1\u05D9 \u05D1\u05E2\u05DE\u05D5\u05D3\u05EA "\u05D6\u05DB\u05D5\u05EA" \u2192 type="income"
- \u05D1\u05E7\u05D5\u05D1\u05E5 \u05D0\u05E9\u05E8\u05D0\u05D9 (Max/Cal) \u05DB\u05DC \u05D4\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05D4\u05DF expense

\u05D4\u05D7\u05D6\u05E8 \u05D0\u05DA \u05D5\u05E8\u05E7 JSON \u05EA\u05E7\u05D9\u05DF \u05DC\u05DC\u05D0 markdown:
[{"date":"YYYY-MM-DD","description":"\u05E9\u05DD","amount":number,"type":"expense","cat":"\u05DE\u05D6\u05D5\u05DF \u05D5\u05E9\u05D5\u05E7"}]`;
      const response = await generateGeminiContent(ai, { contents: prompt });
      const raw = (response.text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
      const first = raw.indexOf("[");
      const last = raw.lastIndexOf("]");
      if (first === -1 || last === -1) throw new Error("Gemini \u05DC\u05D0 \u05D4\u05D7\u05D6\u05D9\u05E8 JSON \u05EA\u05E7\u05D9\u05DF");
      const parsed = JSON.parse(raw.substring(first, last + 1));
      const transactions = parsed.map((t, i) => {
        const cat = VALID_CATS.includes(t.cat) ? t.cat : "\u05E9\u05D5\u05E0\u05D5\u05EA";
        const meta = CAT_META[cat];
        const absAmt = Math.abs(parseFloat(t.amount) || 0);
        return {
          id: Date.now() + i + Math.random(),
          description: String(t.description || "").trim(),
          amount: t.type === "income" ? absAmt : -absAmt,
          date: String(t.date || "").slice(0, 10),
          cat,
          color: meta.color,
          emoji: meta.emoji,
          account: "\u05D9\u05D9\u05D1\u05D5\u05D0"
        };
      }).filter((t) => t.description && t.amount !== 0 && t.date);
      return res.json({ transactions });
    } catch (e) {
      console.error("parse-statement error:", e);
      return res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/categorize", async (req, res) => {
    try {
      const apiKey = getGeminiApiKey(req);
      if (!apiKey) return res.status(400).json({ error: "\u05DE\u05E4\u05EA\u05D7 Gemini \u05D7\u05E1\u05E8" });
      const { descriptions } = req.body;
      if (!Array.isArray(descriptions) || descriptions.length === 0)
        return res.status(400).json({ error: "\u05E8\u05E9\u05D9\u05DE\u05EA \u05EA\u05D9\u05D0\u05D5\u05E8\u05D9\u05DD \u05D7\u05E1\u05E8\u05D4" });
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const prompt = `\u05E1\u05D5\u05D5\u05D2 \u05DB\u05DC \u05EA\u05D9\u05D0\u05D5\u05E8 \u05E2\u05E1\u05E7\u05D4 \u05DC\u05D0\u05D7\u05EA \u05DE\u05D4\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D5\u05EA \u05D4\u05D1\u05D0\u05D5\u05EA \u05D1\u05DC\u05D1\u05D3. \u05D0\u05DC \u05EA\u05DE\u05E6\u05D9\u05D0 \u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D5\u05EA \u05D7\u05D3\u05E9\u05D5\u05EA.

\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D5\u05EA: \u05D4\u05DB\u05E0\u05E1\u05D4 | \u05DE\u05D6\u05D5\u05DF \u05D5\u05E9\u05D5\u05E7 | \u05D3\u05D9\u05D5\u05E8 | \u05EA\u05D7\u05D1\u05D5\u05E8\u05D4 | \u05D7\u05E9\u05D1\u05D5\u05E0\u05D5\u05EA | \u05D1\u05E8\u05D9\u05D0\u05D5\u05EA | \u05D1\u05D9\u05D3\u05D5\u05E8 | \u05E7\u05E0\u05D9\u05D5\u05EA | \u05D7\u05D9\u05E1\u05DB\u05D5\u05DF | \u05E9\u05D5\u05E0\u05D5\u05EA

\u05EA\u05D9\u05D0\u05D5\u05E8\u05D9\u05DD:
${descriptions.map((d, i) => `${i + 1}. ${d}`).join("\n")}

\u05D4\u05D7\u05D6\u05E8 JSON \u05D1\u05DC\u05D1\u05D3 (\u05DC\u05DC\u05D0 markdown):
{"results":["\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4 \u05DC\u05EA\u05D9\u05D0\u05D5\u05E8 1","\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4 \u05DC\u05EA\u05D9\u05D0\u05D5\u05E8 2",...]}
\u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05D1\u05D3\u05D9\u05D5\u05E7 ${descriptions.length} \u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D5\u05EA \u05DC\u05E4\u05D9 \u05D4\u05E1\u05D3\u05E8.`;
      const response = await generateGeminiContent(ai, { contents: prompt });
      const text = response.text || "";
      const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const first = clean.indexOf("{");
      const last = clean.lastIndexOf("}");
      const json = JSON.parse(clean.substring(first, last + 1));
      const VALID = ["\u05D4\u05DB\u05E0\u05E1\u05D4", "\u05DE\u05D6\u05D5\u05DF \u05D5\u05E9\u05D5\u05E7", "\u05D3\u05D9\u05D5\u05E8", "\u05EA\u05D7\u05D1\u05D5\u05E8\u05D4", "\u05D7\u05E9\u05D1\u05D5\u05E0\u05D5\u05EA", "\u05D1\u05E8\u05D9\u05D0\u05D5\u05EA", "\u05D1\u05D9\u05D3\u05D5\u05E8", "\u05E7\u05E0\u05D9\u05D5\u05EA", "\u05D7\u05D9\u05E1\u05DB\u05D5\u05DF", "\u05E9\u05D5\u05E0\u05D5\u05EA"];
      const normalized = (json.results || []).map((c) => VALID.includes(c) ? c : "\u05E9\u05D5\u05E0\u05D5\u05EA");
      return res.json({ results: normalized });
    } catch (e) {
      console.error("Categorize error:", e);
      return res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/funds/search", async (req, res) => {
    const q = String(req.query.q || "").trim();
    const type = req.query.type === "keren" ? "keren" : "pension";
    if (!q) return res.json(getAllFunds(type).slice(0, 10));
    try {
      const results = await searchFunds(q, type);
      res.json(results.slice(0, 15));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/funds/all", (req, res) => {
    const type = req.query.type === "keren" ? "keren" : "pension";
    res.json(getAllFunds(type));
  });
  app.get("/api/funds/:id", async (req, res) => {
    const fund = await getFundById(req.params.id);
    if (!fund) return res.status(404).json({ error: "Fund not found" });
    res.json(fund);
  });
  app.get("/api/forex", async (req, res) => {
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/USD");
      if (response.ok) {
        const data = await response.json();
        const ils = data.rates?.ILS || 3.72;
        const eur = data.rates?.EUR || 0.92;
        const eurIls = ils / eur;
        return res.json({
          success: true,
          rates: {
            USD_ILS: parseFloat(ils.toFixed(4)),
            EUR_ILS: parseFloat(eurIls.toFixed(4)),
            lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      }
    } catch (e) {
      console.error("Forex fetch error:", e);
    }
    return res.json({
      success: true,
      rates: {
        USD_ILS: 3.72,
        EUR_ILS: 4.02,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  });
  function getGeminiApiKey(_req) {
    return serverAiKey();
  }
  async function generateGeminiContent(ai, params) {
    const modelsToTry = [.../* @__PURE__ */ new Set([
      configuredAiModel(),
      "gemini-2.5-flash",
      "gemini-2.0-flash"
    ])];
    let lastError = null;
    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          ...params.config ? { config: params.config } : {}
        });
        if (response && response.text) {
          return response;
        }
      } catch (e) {
        console.warn("Gemini request failed");
        lastError = e;
      }
    }
    throw lastError || new Error("\u05DB\u05DC \u05D3\u05D2\u05DE\u05D9 Gemini \u05E0\u05DB\u05E9\u05DC\u05D5 \u05D1\u05DE\u05E2\u05E0\u05D4");
  }
  app.post("/api/test-ai", requireAppAuth, async (req, res) => {
    try {
      const apiKey = getGeminiApiKey(req);
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: "\u05DE\u05E4\u05EA\u05D7 GEMINI_API_KEY \u05D7\u05E1\u05E8. \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05D2\u05D3\u05D9\u05E8 \u05D0\u05D5\u05EA\u05D5 \u05D1\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05D0\u05D5 \u05D1\u05DE\u05E9\u05EA\u05E0\u05D9 \u05D4\u05E9\u05E8\u05EA."
        });
      }
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const response = await generateGeminiContent(ai, {
        contents: '\u05EA\u05D2\u05D9\u05D1 \u05D1\u05E2\u05D1\u05E8\u05D9\u05EA \u05D1\u05DE\u05D9\u05DC\u05D4 \u05D0\u05D7\u05EA \u05D1\u05DC\u05D1\u05D3: "OK"'
      });
      if (response && response.text) {
        return res.json({
          success: true,
          message: "\u05DE\u05E4\u05EA\u05D7 \u05D4-Gemini API \u05EA\u05E7\u05D9\u05DF, \u05E4\u05E2\u05D9\u05DC \u05D5\u05DE\u05D2\u05D9\u05D1 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4! \u{1F916}\u2728"
        });
      } else {
        return res.status(400).json({
          success: false,
          error: "\u05EA\u05D2\u05D5\u05D1\u05D4 \u05E8\u05D9\u05E7\u05D4 \u05DE\u05E9\u05E8\u05EA \u05D4-AI."
        });
      }
    } catch (e) {
      console.error("Test AI request failed");
      return res.status(400).json({
        success: false,
        error: "AI provider unavailable; check configuration and quota."
      });
    }
  });
  app.post("/api/gemini/proxy", requireAppAuth, async (req, res) => {
    try {
      const apiKey = getGeminiApiKey(req);
      if (!apiKey) return res.status(503).json({ error: "GEMINI_API_KEY \u05DC\u05D0 \u05DE\u05D5\u05D2\u05D3\u05E8 \u05D1\u05E9\u05E8\u05EA" });
      const { contents } = req.body;
      if (!contents) return res.status(400).json({ error: "contents \u05D7\u05E1\u05E8" });
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const response = await generateGeminiContent(ai, { contents });
      return res.json({ text: response.text || "" });
    } catch (e) {
      console.error("Gemini proxy failed:", e?.message || e);
      return res.status(502).json({ error: "\u05E9\u05D9\u05E8\u05D5\u05EA Gemini \u05DC\u05D0 \u05D6\u05DE\u05D9\u05DF \u05E2\u05D1\u05D5\u05E8 \u05D4\u05DE\u05D5\u05D3\u05DC \u05D0\u05D5 \u05D4\u05DE\u05E4\u05EA\u05D7 \u05E9\u05D4\u05D5\u05D2\u05D3\u05E8\u05D5. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1 \u05D1\u05E2\u05D5\u05D3 \u05E8\u05D2\u05E2." });
    }
  });
  async function fetchGoogleQuote(symbol) {
    let cleanSymbol = symbol.trim();
    let exchange = "";
    if (cleanSymbol.endsWith(".TA")) {
      cleanSymbol = cleanSymbol.replace(".TA", "");
      exchange = "TLV";
    } else if (cleanSymbol.includes(":")) {
      const parts = cleanSymbol.split(":");
      cleanSymbol = parts[0];
      exchange = parts[1];
    }
    const exchangesToTry = exchange ? [exchange] : ["NASDAQ", "NYSE", "TLV"];
    for (const ex of exchangesToTry) {
      try {
        const url = `https://www.google.com/finance/quote/${encodeURIComponent(cleanSymbol)}:${ex}?hl=en`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html"
          }
        });
        if (!res.ok) continue;
        const html = await res.text();
        const pdsbrcRegex = /jsname="Pdsbrc"[^>]*>\s*<span>([^<]+)<\/span>/gi;
        let match;
        const prices = [];
        while ((match = pdsbrcRegex.exec(html)) !== null) {
          prices.push({ value: match[1], index: match.index });
        }
        const currencyRegex = /(?:[\$\₪\€\£]|[A-Z]{3})[\s\u00A0]*[0-9,]+\.[0-9]+/i;
        const mainPriceObj = prices.find((p) => currencyRegex.test(p.value));
        if (!mainPriceObj) continue;
        const mainPriceString = mainPriceObj.value;
        const mainPriceIndex = mainPriceObj.index;
        const subHtml = html.substring(mainPriceIndex, mainPriceIndex + 2e3);
        const absChangeMatch = subHtml.match(/jsname="xnruHf"[^>]*>\s*<span[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i) || subHtml.match(/jsname="xnruHf"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i);
        const pctChangeMatch = subHtml.match(/jsname="vY9t3b"[^>]*>\s*<span[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i) || subHtml.match(/jsname="vY9t3b"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i);
        let isNegative = subHtml.includes("arrow_downward") || pctChangeMatch && pctChangeMatch[1].includes("-");
        let sign = isNegative ? -1 : 1;
        const numMatch = mainPriceString.match(/[0-9,]+\.[0-9]+/);
        const curMatch = mainPriceString.match(/^[^\s\u00A0\d]+/);
        if (numMatch) {
          const rawPrice = parseFloat(numMatch[0].replace(/,/g, ""));
          let currency = curMatch ? curMatch[0].trim() : "USD";
          let price = rawPrice;
          if (currency === "ILA") {
            price = price / 100;
            currency = "ILS";
          }
          if (currency === "$") currency = "USD";
          if (currency === "\u20AA") currency = "ILS";
          const pctChangeText = pctChangeMatch ? pctChangeMatch[1].replace(/[+\-%\s]/g, "").trim() : "0";
          const changePercent = parseFloat(pctChangeText) * sign;
          const nameMatch = html.match(/<div class="zzDeGe">([^<]+)<\/div>/i) || html.match(/class="gO24Ff">([^<]+)<\/div>/i);
          const companyName = nameMatch ? nameMatch[1].trim() : cleanSymbol;
          return {
            success: true,
            symbol,
            price: parseFloat(price.toFixed(2)),
            prevClose: parseFloat((price / (1 + changePercent / 100)).toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            currency,
            companyName,
            apiSource: `Google Finance Scraped (${ex})`,
            lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
          };
        }
      } catch (e) {
        console.error(`Google scrape error for ${cleanSymbol} on ${ex}:`, e);
      }
    }
    return null;
  }
  app.get("/api/stock-quote/:symbol", async (req, res) => {
    let rawParam = req.params.symbol || "AAPL";
    try {
      rawParam = decodeURIComponent(rawParam);
    } catch (e) {
    }
    let symbol = rawParam.replace(/^\$/, "").trim();
    if (!symbol) {
      return res.json({ success: false, error: "\u05E1\u05D9\u05DE\u05D5\u05DC \u05E8\u05D9\u05E7" });
    }
    const upperSymbol = symbol.toUpperCase();
    const HEBREW_MAP = {
      "\u05D8\u05E1\u05DC\u05D4": "TSLA",
      "\u05D0\u05E0\u05D1\u05D9\u05D3\u05D9\u05D4": "NVDA",
      "\u05D0\u05E4\u05DC": "AAPL",
      "\u05D0\u05DE\u05D6\u05D5\u05DF": "AMZN",
      "\u05DE\u05D9\u05E7\u05E8\u05D5\u05E1\u05D5\u05E4\u05D8": "MSFT",
      "\u05D2\u05D5\u05D2\u05DC": "GOOGL",
      "\u05DE\u05D8\u05D4": "META",
      "\u05E4\u05D9\u05D9\u05E1\u05D1\u05D5\u05E7": "META",
      "\u05D8\u05D1\u05E2": "TEVA",
      "\u05D0\u05DC\u05D1\u05D9\u05D8": "ESLT",
      "\u05D0\u05D9\u05E0\u05D8\u05DC": "INTC",
      "\u05D3\u05D9\u05E1\u05E0\u05D9": "DIS",
      "\u05E0\u05D8\u05E4\u05DC\u05D9\u05E7\u05E1": "NFLX",
      "\u05E0\u05D9\u05D9\u05E7\u05D9": "NKE",
      "\u05E4\u05D9\u05D9\u05E4\u05D0\u05DC": "PYPL",
      "\u05D1\u05D5\u05D0\u05D9\u05E0\u05D2": "BA",
      "\u05D1\u05D9\u05D8\u05E7\u05D5\u05D9\u05DF": "BTC-USD",
      "\u05D0\u05EA\u05E8\u05D9\u05D5\u05DD": "ETH-USD",
      "\u05E1\u05D5\u05DC\u05D0\u05E0\u05D4": "SOL-USD",
      "\u05DC\u05D0\u05D5\u05DE\u05D9": "LUMI.TA",
      "\u05E4\u05D5\u05E2\u05DC\u05D9\u05DD": "POLI.TA",
      "\u05E9\u05D5\u05E4\u05E8\u05E1\u05DC": "SAE.TA",
      "\u05D0\u05DC \u05E2\u05DC": "ELAL.TA",
      "\u05D0\u05DC\u05E2\u05DC": "ELAL.TA",
      "\u05E0\u05D9\u05D9\u05E1": "NICE",
      "\u05D8\u05D0\u05D5\u05D0\u05E8": "TSEM",
      "\u05E1\u05E4\u05D9\u05D9": "SPY",
      "\u05D0\u05E1 \u05D0\u05E0\u05D3 \u05E4\u05D9": "SPY",
      "\u05E0\u05D0\u05E1\u05D3\u05E7": "QQQ",
      "TA35": "TA35.TA",
      "BTC": "BTC-USD",
      "ETH": "ETH-USD",
      "SOL": "SOL-USD"
    };
    const mappedSymbol = HEBREW_MAP[symbol] || HEBREW_MAP[symbol.toLowerCase()] || upperSymbol;
    const CRYPTO_COINGECKO_MAP = {
      "BTC-USD": "bitcoin",
      "BTC": "bitcoin",
      "ETH-USD": "ethereum",
      "ETH": "ethereum",
      "SOL-USD": "solana",
      "SOL": "solana",
      "DOGE-USD": "dogecoin",
      "DOGE": "dogecoin",
      "ADA-USD": "cardano",
      "ADA": "cardano",
      "XRP-USD": "ripple",
      "XRP": "ripple"
    };
    if (CRYPTO_COINGECKO_MAP[mappedSymbol]) {
      const coinId = CRYPTO_COINGECKO_MAP[mappedSymbol];
      try {
        const cgRes = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`,
          { headers: { Accept: "application/json" } }
        );
        if (cgRes.ok) {
          const cgData = await cgRes.json();
          if (cgData[coinId]) {
            const price = cgData[coinId].usd;
            const changePercent = cgData[coinId].usd_24h_change || 0;
            return res.json({
              success: true,
              symbol: mappedSymbol,
              price: parseFloat(price.toFixed(2)),
              prevClose: parseFloat((price / (1 + changePercent / 100)).toFixed(2)),
              changePercent: parseFloat(changePercent.toFixed(2)),
              currency: "USD",
              companyName: `${coinId.charAt(0).toUpperCase() + coinId.slice(1)} (Crypto API)`,
              apiSource: "CoinGecko Live",
              lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
        }
      } catch (e) {
        console.warn(`CoinGecko fetch failed for ${coinId}:`, e);
      }
    }
    async function fetchYahooChart(ticker) {
      const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
      for (const host2 of hosts) {
        try {
          const url = `https://${host2}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              "Accept": "application/json"
            }
          });
          if (response.ok) {
            const data = await response.json();
            const result = data.chart?.result?.[0];
            if (result) {
              const meta = result.meta;
              let currentPrice = meta.regularMarketPrice || meta.chartPreviousClose || 0;
              let prevClose = meta.chartPreviousClose || currentPrice;
              let currency = meta.currency || "USD";
              if (currency === "ILA") {
                currentPrice = currentPrice / 100;
                prevClose = prevClose / 100;
                currency = "ILS";
              }
              const changePercent = prevClose ? (currentPrice - prevClose) / prevClose * 100 : 0;
              const companyName = meta.shortName || meta.longName || ticker;
              if (currentPrice > 0) {
                return {
                  success: true,
                  symbol: meta.symbol || ticker,
                  price: parseFloat(currentPrice.toFixed(2)),
                  prevClose: parseFloat(prevClose.toFixed(2)),
                  changePercent: parseFloat(changePercent.toFixed(2)),
                  currency,
                  companyName,
                  apiSource: "Yahoo Finance Live",
                  lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
                };
              }
            }
          }
        } catch (e) {
          console.error(`Error fetching Yahoo chart for ${ticker}:`, e);
        }
      }
      return null;
    }
    let quote = await fetchYahooChart(mappedSymbol);
    if (quote) {
      return res.json(quote);
    }
    quote = await fetchGoogleQuote(mappedSymbol);
    if (quote) {
      return res.json(quote);
    }
    try {
      const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=1`;
      const searchRes = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const foundSymbol = searchData.quotes?.[0]?.symbol;
        if (foundSymbol) {
          quote = await fetchYahooChart(foundSymbol) || await fetchGoogleQuote(foundSymbol);
          if (quote) {
            return res.json(quote);
          }
        }
      }
    } catch (e) {
      console.error(`Yahoo Search error for ${symbol}:`, e);
    }
    const STATIC_FINANCIAL_FALLBACKS = {
      "AAPL": { price: 340.08, changePct: 0.94, name: "Apple Inc." },
      "NVDA": { price: 197.01, changePct: 0.25, name: "NVIDIA Corporation" },
      "TSLA": { price: 307.44, changePct: -0.58, name: "Tesla, Inc." },
      "MSFT": { price: 393.35, changePct: 1.09, name: "Microsoft Corporation" },
      "AMZN": { price: 230.86, changePct: -0.23, name: "Amazon.com, Inc." },
      "GOOGL": { price: 333.71, changePct: 2.19, name: "Alphabet Inc." },
      "META": { price: 685.5, changePct: 1.45, name: "Meta Platforms, Inc." },
      "SPY": { price: 602.15, changePct: 0.65, name: "SPDR S&P 500 ETF Trust" },
      "QQQ": { price: 520.4, changePct: 1.12, name: "Invesco QQQ Trust" },
      "TEVA": { price: 31.67, changePct: 1.9, name: "Teva Pharmaceutical Industries" },
      "BTC-USD": { price: 64371.02, changePct: 0.81, name: "Bitcoin USD" },
      "ETH-USD": { price: 3450.2, changePct: 1.35, name: "Ethereum USD" }
    };
    const fallbackKey = STATIC_FINANCIAL_FALLBACKS[mappedSymbol] ? mappedSymbol : STATIC_FINANCIAL_FALLBACKS[upperSymbol] ? upperSymbol : null;
    if (fallbackKey) {
      const fb = STATIC_FINANCIAL_FALLBACKS[fallbackKey];
      return res.json({
        success: true,
        symbol: fallbackKey,
        price: fb.price,
        prevClose: parseFloat((fb.price / (1 + fb.changePct / 100)).toFixed(2)),
        changePercent: fb.changePct,
        currency: fb.currency || "USD",
        companyName: fb.name,
        apiSource: "Global Market Index (Fallback)",
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    return res.json({
      success: false,
      symbol,
      error: `\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05D1\u05D9\u05D0 \u05DE\u05D7\u05D9\u05E8 \u05E9\u05D5\u05E7 \u05D1\u05DC\u05D9\u05D9\u05D1 \u05E2\u05D1\u05D5\u05E8 ${symbol}`
    });
  });
  app.get("/api/market-summary", async (req, res) => {
    try {
      const [cgRes, fxRes] = await Promise.allSettled([
        fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"),
        fetch("https://open.er-api.com/v6/latest/USD")
      ]);
      let btcPrice = 64371.02;
      let btcChange = 0.81;
      let ethPrice = 3450.2;
      let ethChange = 1.35;
      let usdIls = 3.65;
      if (cgRes.status === "fulfilled" && cgRes.value.ok) {
        const cgData = await cgRes.value.json();
        if (cgData.bitcoin) {
          btcPrice = cgData.bitcoin.usd;
          btcChange = cgData.bitcoin.usd_24h_change || 0;
        }
        if (cgData.ethereum) {
          ethPrice = cgData.ethereum.usd;
          ethChange = cgData.ethereum.usd_24h_change || 0;
        }
      }
      if (fxRes.status === "fulfilled" && fxRes.value.ok) {
        const fxData = await fxRes.value.json();
        if (fxData.rates?.ILS) {
          usdIls = fxData.rates.ILS;
        }
      }
      return res.json({
        success: true,
        indices: [
          { symbol: "SPY", name: "S&P 500 (SPY)", price: 602.15, changePercent: 0.65, type: "stock" },
          { symbol: "QQQ", name: "Nasdaq (QQQ)", price: 520.4, changePercent: 1.12, type: "stock" },
          { symbol: "BTC", name: "Bitcoin (BTC)", price: parseFloat(btcPrice.toFixed(2)), changePercent: parseFloat(btcChange.toFixed(2)), type: "crypto" },
          { symbol: "ETH", name: "Ethereum (ETH)", price: parseFloat(ethPrice.toFixed(2)), changePercent: parseFloat(ethChange.toFixed(2)), type: "crypto" },
          { symbol: "USD/ILS", name: "\u05E9\u05E2\u05E8 \u05D3\u05D5\u05DC\u05E8", price: parseFloat(usdIls.toFixed(3)), changePercent: 0.15, type: "forex", currency: "ILS" }
        ],
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (e) {
      return res.json({
        success: true,
        indices: [
          { symbol: "SPY", name: "S&P 500 (SPY)", price: 602.15, changePercent: 0.65, type: "stock" },
          { symbol: "QQQ", name: "Nasdaq (QQQ)", price: 520.4, changePercent: 1.12, type: "stock" },
          { symbol: "BTC", name: "Bitcoin (BTC)", price: 64371.02, changePercent: 0.81, type: "crypto" },
          { symbol: "USD/ILS", name: "\u05E9\u05E2\u05E8 \u05D3\u05D5\u05DC\u05E8", price: 3.65, changePercent: 0.15, type: "forex", currency: "ILS" }
        ]
      });
    }
  });
  app.post("/api/ocr", async (req, res) => {
    try {
      const apiKey = getGeminiApiKey(req);
      if (!apiKey) {
        return res.status(400).json({
          error: "\u05DE\u05E4\u05EA\u05D7 GEMINI_API_KEY \u05D7\u05E1\u05E8. \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05D2\u05D3\u05D9\u05E8 \u05D0\u05D5\u05EA\u05D5 \u05D1\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05D0\u05D5 \u05D1\u05DE\u05E9\u05EA\u05E0\u05D9 \u05D4\u05E9\u05E8\u05EA."
        });
      }
      const { imageBase64, mimeType, docType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "\u05D7\u05E1\u05E8 \u05E7\u05D5\u05D1\u05E5/\u05EA\u05DE\u05D5\u05E0\u05D4 \u05DC\u05E2\u05D9\u05D1\u05D5\u05D3 (imageBase64)" });
      }
      const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",").pop() : imageBase64;
      const ai = new import_genai.GoogleGenAI({ apiKey });
      let promptText = `\u05D0\u05EA\u05D4 \u05D0\u05DC\u05D2\u05D5\u05E8\u05D9\u05EA\u05DD \u05D7\u05DB\u05DD \u05DC\u05D6\u05D9\u05D4\u05D5\u05D9 \u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05E4\u05D9\u05E0\u05E0\u05E1\u05D9\u05D5\u05EA \u05D5\u05E7\u05D1\u05DC\u05D4. \u05D7\u05DC\u05E5 \u05D0\u05EA \u05DB\u05DC \u05D4\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05DE\u05D4\u05EA\u05DE\u05D5\u05E0\u05D4.
\u05D4\u05D7\u05D6\u05E8 \u05D0\u05DA \u05D5\u05E8\u05E7 \u05DE\u05E2\u05E8\u05DA JSON \u05EA\u05E7\u05D9\u05DF \u05D1\u05DE\u05D1\u05E0\u05D4 \u05D4\u05D1\u05D0 \u05DC\u05DC\u05D0 \u05D8\u05E7\u05E1\u05D8 \u05E0\u05D5\u05E1\u05E3 \u05D5\u05DC\u05DC\u05D0 markdown:
[{"date":"YYYY-MM-DD","description":"\u05E9\u05DD \u05D1\u05D9\u05EA \u05D4\u05E2\u05E1\u05E7","amount":number}]
\u05D7\u05D5\u05E7\u05D9\u05DD:
- \u05E1\u05DB\u05D5\u05DD \u05E9\u05DC\u05D9\u05DC\u05D9 = \u05D4\u05D5\u05E6\u05D0\u05D4 / \u05D7\u05D9\u05D5\u05D1.
- \u05E1\u05DB\u05D5\u05DD \u05D7\u05D9\u05D5\u05D1\u05D9 = \u05D4\u05DB\u05E0\u05E1\u05D4 / \u05D6\u05D9\u05DB\u05D5\u05D9.
- \u05D0\u05DD \u05D0\u05D9\u05DF \u05E9\u05E0\u05D4, \u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05E9\u05E0\u05D4 \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9\u05EA (${(/* @__PURE__ */ new Date()).getFullYear()}).
- \u05D7\u05DC\u05E5 \u05D0\u05EA \u05DB\u05DC \u05D4\u05E9\u05D5\u05E8\u05D5\u05EA \u05E9\u05D2\u05DC\u05D5\u05D9\u05D5\u05EA \u05D1\u05EA\u05DE\u05D5\u05E0\u05D4.`;
      if (docType === "stocks") {
        promptText = `\u05D7\u05DC\u05E5 \u05D0\u05EA \u05DB\u05DC \u05E0\u05D9\u05D9\u05E8\u05D5\u05EA \u05D4\u05E2\u05E8\u05DA (\u05DE\u05E0\u05D9\u05D5\u05EA/\u05EA\u05E2\u05D5\u05D3\u05D5\u05EA \u05E1\u05DC) \u05DE\u05EA\u05DE\u05D5\u05E0\u05EA \u05EA\u05D9\u05E7 \u05D4\u05D4\u05E9\u05E7\u05E2\u05D5\u05EA.
\u05D4\u05D7\u05D6\u05E8 \u05D0\u05DA \u05D5\u05E8\u05E7 \u05DE\u05E2\u05E8\u05DA JSON \u05D1\u05DE\u05D1\u05E0\u05D4 \u05D4\u05D1\u05D0:
[{"symbol":"TICKER","name":"\u05E9\u05DD \u05D4\u05D7\u05D1\u05E8\u05D4","shares":number,"avgCost":number,"currentPrice":number}]
- symbol: \u05D4\u05E1\u05D9\u05DE\u05D5\u05DC \u05D4\u05D1\u05D9\u05E0\u05DC\u05D0\u05D5\u05DE\u05D9 (\u05DB\u05D2\u05D5\u05DF NVDA, AAPL, TEVA)
- avgCost: \u05DE\u05D7\u05D9\u05E8 \u05E8\u05DB\u05D9\u05E9\u05D4 \u05DE\u05DE\u05D5\u05E6\u05E2 \u05DC\u05DE\u05E0\u05D9\u05D4 \u05D1\u05D3\u05D5\u05DC\u05E8\u05D9\u05DD
- currentPrice: \u05DE\u05D7\u05D9\u05E8 \u05E0\u05D5\u05DB\u05D7\u05D9 \u05DC\u05DE\u05E0\u05D9\u05D4`;
      } else if (docType === "keren" || docType === "pension") {
        promptText = `\u05D7\u05DC\u05E5 \u05D0\u05EA \u05D4\u05E9\u05D5\u05D5\u05D9 \u05D4\u05DB\u05D5\u05DC\u05DC (\u05D1\u05E9\u05E7\u05DC\u05D9\u05DD) \u05D5\u05D4\u05EA\u05E9\u05D5\u05D0\u05D4 \u05D4\u05DE\u05EA\u05D5\u05D0\u05E8\u05EA \u05D1\u05D3\u05D5\u05D7/\u05E6\u05D9\u05DC\u05D5\u05DD \u05D4\u05DE\u05E1\u05DA.
\u05D4\u05D7\u05D6\u05E8 \u05D0\u05DA \u05D5\u05E8\u05E7 JSON \u05EA\u05E7\u05D9\u05DF:
{"value":number, "ytd":number}`;
      }
      const response = await generateGeminiContent(ai, {
        contents: [
          {
            role: "user",
            parts: [
              { text: promptText },
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType || "image/jpeg"
                }
              }
            ]
          }
        ]
      });
      const responseText = response.text || "";
      let cleanedText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const firstBracket = cleanedText.indexOf("[");
      const lastBracket = cleanedText.lastIndexOf("]");
      const firstBrace = cleanedText.indexOf("{");
      const lastBrace = cleanedText.lastIndexOf("}");
      let jsonResult = null;
      try {
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          jsonResult = JSON.parse(cleanedText.substring(firstBracket, lastBracket + 1));
        } else if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonResult = JSON.parse(cleanedText.substring(firstBrace, lastBrace + 1));
        } else {
          jsonResult = JSON.parse(cleanedText);
        }
        return res.json({ success: true, result: jsonResult });
      } catch (e) {
        return res.json({ success: true, rawText: responseText, result: null });
      }
    } catch (error) {
      console.error("OCR Error:", error);
      return res.status(500).json({ error: error.message || "Error processing OCR" });
    }
  });
  app.post("/api/ai-advisor", async (req, res) => {
    try {
      const apiKey = getGeminiApiKey(req);
      if (!apiKey) {
        return res.status(400).json({
          error: "\u05DE\u05E4\u05EA\u05D7 GEMINI_API_KEY \u05D7\u05E1\u05E8. \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05D2\u05D3\u05D9\u05E8 \u05D0\u05D5\u05EA\u05D5 \u05D1\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA."
        });
      }
      const { netSalary, monthExpense, monthIncome, safeToSpend, stockVal, topCategories } = req.body;
      const promptText = `\u05D0\u05EA\u05D4 \u05D9\u05D5\u05E2\u05E5 \u05E4\u05D9\u05E0\u05E0\u05E1\u05D9 \u05D0\u05D9\u05E9\u05D9 \u05D5\u05D7\u05DB\u05DD. \u05E0\u05EA\u05D7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D4\u05E4\u05D9\u05E0\u05E0\u05E1\u05D9\u05D9\u05DD \u05E9\u05DC \u05D4\u05DE\u05E9\u05EA\u05DE\u05E9:
- \u05DE\u05E9\u05DB\u05D5\u05E8\u05EA \u05E0\u05D8\u05D5: \u20AA${netSalary || 0}
- \u05D4\u05DB\u05E0\u05E1\u05D5\u05EA \u05D4\u05D7\u05D5\u05D3\u05E9: \u20AA${monthIncome || 0}
- \u05D4\u05D5\u05E6\u05D0\u05D5\u05EA \u05D4\u05D7\u05D5\u05D3\u05E9: \u20AA${monthExpense || 0}
- \u05D9\u05EA\u05E8\u05D4 \u05E4\u05E0\u05D5\u05D9\u05D4 \u05DC\u05EA\u05E7\u05E6\u05D9\u05D1: \u20AA${safeToSpend || 0}
- \u05E9\u05D5\u05D5\u05D9 \u05EA\u05D9\u05E7 \u05D4\u05E9\u05E7\u05E2\u05D5\u05EA: $${stockVal || 0}
- \u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D5\u05EA \u05DE\u05D5\u05D1\u05D9\u05DC\u05D5\u05EA: ${JSON.stringify(topCategories || [])}

\u05EA\u05DF 3 \u05EA\u05D5\u05D1\u05E0\u05D5\u05EA/\u05D4\u05DE\u05DC\u05E6\u05D5\u05EA \u05E4\u05D9\u05E0\u05E0\u05E1\u05D9\u05D5\u05EA \u05E7\u05E6\u05E8\u05D5\u05EA, \u05DE\u05DE\u05D5\u05E7\u05D3\u05D5\u05EA \u05D5\u05DE\u05E2\u05E9\u05D9\u05D5\u05EA \u05D1\u05E2\u05D1\u05E8\u05D9\u05EA.
\u05D4\u05D7\u05D6\u05E8 \u05D0\u05DA \u05D5\u05E8\u05E7 JSON \u05EA\u05E7\u05D9\u05DF \u05D1\u05DE\u05D1\u05E0\u05D4 \u05D4\u05D1\u05D0 \u05DC\u05DC\u05D0 markdown:
{"insights":["\u05EA\u05D5\u05D1\u05E0\u05D4 1", "\u05EA\u05D5\u05D1\u05E0\u05D4 2", "\u05EA\u05D5\u05D1\u05E0\u05D4 3"]}`;
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const response = await generateGeminiContent(ai, {
        contents: promptText
      });
      const responseText = response.text || "";
      let cleanedText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const firstBrace = cleanedText.indexOf("{");
      const lastBrace = cleanedText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonResult = JSON.parse(cleanedText.substring(firstBrace, lastBrace + 1));
        return res.json({ success: true, insights: jsonResult.insights || [] });
      }
      return res.json({ success: true, insights: [responseText] });
    } catch (error) {
      console.error("AI Advisor Error:", error);
      return res.status(500).json({ error: error.message || "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E0\u05D9\u05EA\u05D5\u05D7 AI" });
    }
  });
  app.get("/api/user/load/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const reqUserId = req.userId;
      if (!reqUserId || reqUserId !== userId) return res.status(403).json({ error: "\u05D0\u05D9\u05DF \u05D4\u05E8\u05E9\u05D0\u05D4" });
      const record = await loadUserData(userId);
      if (!record) {
        return res.status(404).json({ error: "\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E2\u05D1\u05D5\u05E8 \u05DE\u05E9\u05EA\u05DE\u05E9 \u05D6\u05D4" });
      }
      res.json(record);
    } catch (e) {
      res.status(500).json({ error: e.message || "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD" });
    }
  });
  app.post("/api/user/save", async (req, res) => {
    try {
      const { userId, data, expectedRevision } = req.body;
      if (!userId || !data) {
        return res.status(400).json({ error: "\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D7\u05E1\u05E8\u05D9\u05DD \u05DC\u05E9\u05DE\u05D9\u05E8\u05D4" });
      }
      const reqUserId = req.userId;
      if (!reqUserId || reqUserId !== userId) return res.status(403).json({ error: "\u05D0\u05D9\u05DF \u05D4\u05E8\u05E9\u05D0\u05D4" });
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0) return res.status(400).json({ error: "\u05E0\u05D3\u05E8\u05E9\u05EA \u05D2\u05E8\u05E1\u05EA \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05EA\u05E7\u05D9\u05E0\u05D4" });
      const revision = await saveUserData(userId, data, expectedRevision);
      res.json({ success: true, revision });
    } catch (e) {
      if (e instanceof RevisionConflictError) return res.status(409).json({ error: "\u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D4\u05E9\u05EA\u05E0\u05D5 \u05D1\u05DE\u05DB\u05E9\u05D9\u05E8 \u05D0\u05D7\u05E8. \u05E8\u05E2\u05E0\u05E0\u05D5 \u05D5\u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1." });
      res.status(500).json({ error: e.message || "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD" });
    }
  });
  app.delete("/api/user/account", async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "\u05DC\u05D0 \u05DE\u05D0\u05D5\u05DE\u05EA" });
    try {
      return await deleteUserAccount(userId) ? res.sendStatus(204) : res.sendStatus(404);
    } catch {
      return res.status(500).json({ error: "\u05DE\u05D7\u05D9\u05E7\u05EA \u05D4\u05D7\u05E9\u05D1\u05D5\u05DF \u05E0\u05DB\u05E9\u05DC\u05D4" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express4.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
  app.listen(PORT, host, () => {
    console.log(`Server running on http://${host}:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
