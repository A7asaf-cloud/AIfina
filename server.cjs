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
var import_express2 = __toESM(require("express"), 1);
var import_cookie_parser = __toESM(require("cookie-parser"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_fs2 = __toESM(require("fs"), 1);

// server/authRouter.ts
var import_express = require("express");
var import_crypto2 = __toESM(require("crypto"), 1);

// server/authUtils.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var JWT_SECRET = () => process.env.JWT_SECRET || "aifina-default-secret-key-change-in-production";
var REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "aifina-refresh-secret-key-change-in-production";
var ACCESS_EXPIRE_SEC = () => parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || "15") * 60;
var REFRESH_EXPIRE_DAYS = () => parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS || "30");
var GOOGLE_REDIRECT_URI = () => process.env.GOOGLE_REDIRECT_URI || "https://aifina.ai.studio/auth/google/callback";
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

// server/authFileStore.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var DATA_DIR = import_path.default.join(process.cwd(), "data");
function ensureDataDir() {
  if (!import_fs.default.existsSync(DATA_DIR)) import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
}
function readJson(filename) {
  ensureDataDir();
  const filePath = import_path.default.join(DATA_DIR, filename);
  if (!import_fs.default.existsSync(filePath)) return [];
  try {
    return JSON.parse(import_fs.default.readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }
}
function writeJson(filename, data) {
  ensureDataDir();
  import_fs.default.writeFileSync(import_path.default.join(DATA_DIR, filename), JSON.stringify(data, null, 2), "utf8");
}
var AUTH_USERS_FILE = "auth_users.json";
function getAllAuthUsers() {
  return readJson(AUTH_USERS_FILE);
}
function findAuthUserByEmail(email) {
  return getAllAuthUsers().find((u) => u.email === email.toLowerCase().trim());
}
function findAuthUserById(id) {
  return getAllAuthUsers().find((u) => u.id === id);
}
function saveAuthUser(user) {
  const users = getAllAuthUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  writeJson(AUTH_USERS_FILE, users);
}
function getOrCreateDemoUser() {
  const email = "demo@finance.il";
  let user = findAuthUserByEmail(email);
  if (!user) {
    user = {
      id: "demo_user_id",
      email,
      name: "\u05D9\u05E9\u05E8\u05D0\u05DC \u05D9\u05E9\u05E8\u05D0\u05DC\u05D9",
      avatarUrl: "",
      googleId: "",
      isVerified: true,
      tokenVersion: 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveAuthUser(user);
  }
  return user;
}
function incrementTokenVersion(userId) {
  const users = getAllAuthUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return 0;
  users[idx].tokenVersion = (users[idx].tokenVersion || 0) + 1;
  writeJson(AUTH_USERS_FILE, users);
  return users[idx].tokenVersion;
}
var OTP_FILE = "auth_otp_codes.json";
function getRecentOtps(email, windowMs) {
  const cutoff = new Date(Date.now() - windowMs).toISOString();
  return readJson(OTP_FILE).filter(
    (r) => r.email === email && r.expiresAt > cutoff
  );
}
function saveOtp(record) {
  const otps = readJson(OTP_FILE);
  otps.push(record);
  writeJson(OTP_FILE, otps);
}
function getUnusedValidOtps(email) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return readJson(OTP_FILE).filter((r) => r.email === email && !r.used && r.expiresAt > now).sort((a, b) => b.expiresAt.localeCompare(a.expiresAt));
}
function markOtpUsed(id) {
  const otps = readJson(OTP_FILE).map((r) => r.id === id ? { ...r, used: true } : r);
  writeJson(OTP_FILE, otps);
}

// server/authEmail.ts
var import_nodemailer = __toESM(require("nodemailer"), 1);
async function sendOtpEmail(toEmail, code) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  if (!host || !user) {
    console.warn(`[DEV] OTP for ${toEmail}: ${code}  (SMTP \u05DC\u05D0 \u05DE\u05D5\u05D2\u05D3\u05E8 \u2014 \u05DE\u05D5\u05D3\u05E4\u05E1 \u05DC-log)`);
    return;
  }
  const transporter = import_nodemailer.default.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: { user, pass: process.env.SMTP_PASS || "" }
  });
  const from = process.env.FROM_EMAIL || user;
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
function issueSession(res, user) {
  const refreshToken = createRefreshToken(user.id, user.email, user.tokenVersion || 0);
  setCookie(res, refreshToken);
  return createAccessToken(user.id, user.email);
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
  const recent = getRecentOtps(email, OTP_WINDOW_MIN * 6e4);
  if (recent.length >= OTP_RATE_LIMIT)
    return res.status(429).json({ detail: "\u05D9\u05D5\u05EA\u05E8 \u05DE\u05D3\u05D9 \u05D1\u05E7\u05E9\u05D5\u05EA \u2014 \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 \u05D1\u05E2\u05D5\u05D3 15 \u05D3\u05E7\u05D5\u05EA" });
  const code = generateOtp();
  saveOtp({
    id: import_crypto2.default.randomUUID(),
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
  const candidates = getUnusedValidOtps(email);
  const matched = candidates.find((r) => verifyOtp(email, code, r.code));
  if (!matched)
    return res.status(401).json({ detail: "\u05E7\u05D5\u05D3 \u05E9\u05D2\u05D5\u05D9 \u05D0\u05D5 \u05E9\u05E4\u05D2 \u05EA\u05D5\u05E7\u05E4\u05D5" });
  markOtpUsed(matched.id);
  let user = findAuthUserByEmail(email);
  if (!user) {
    user = makeUser({ id: import_crypto2.default.randomUUID(), email, name: "" });
    saveAuthUser(user);
  } else {
    user = { ...user, isVerified: true, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    saveAuthUser(user);
  }
  const accessToken = issueSession(res, user);
  return res.json({ access_token: accessToken, user: formatUser(user) });
});
authRouter.get("/google", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(501).json({ detail: "Google OAuth \u05DC\u05D0 \u05DE\u05D5\u05D2\u05D3\u05E8" });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: GOOGLE_REDIRECT_URI(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
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
    if (!email) throw new Error("No email from Google");
    let user = findAuthUserByEmail(email);
    if (!user) {
      user = makeUser({
        id: import_crypto2.default.randomUUID(),
        email,
        name: info.name || "",
        avatarUrl: info.picture || "",
        googleId: info.sub || ""
      });
    } else {
      user = {
        ...user,
        googleId: info.sub || user.googleId,
        name: info.name || user.name,
        avatarUrl: info.picture || user.avatarUrl,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    saveAuthUser(user);
    const accessToken = issueSession(res, user);
    return res.redirect(`${frontendUrl}/#access_token=${accessToken}`);
  } catch (err) {
    console.error("Google OAuth error:", err);
    return res.redirect(`${process.env.FRONTEND_URL || "https://aifina.ai.studio/"}/#auth_error=google_failed`);
  }
});
authRouter.post("/refresh", (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ detail: "\u05D0\u05D9\u05DF refresh token" });
  try {
    const payload = verifyRefreshToken(token);
    let user = findAuthUserById(payload.sub);
    if (!user) {
      user = makeUser({ id: payload.sub, email: payload.email, tokenVersion: 0 });
      saveAuthUser(user);
    }
    if ((payload.ver ?? 0) !== (user.tokenVersion || 0)) {
      clearCookie(res);
      return res.status(401).json({ detail: "Token \u05D1\u05D5\u05D8\u05DC \u2014 \u05D9\u05E9 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DE\u05D7\u05D3\u05E9" });
    }
    const accessToken = issueSession(res, user);
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
authRouter.post("/logout-all", (req, res) => {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return res.status(401).json({ detail: "\u05DC\u05D0 \u05DE\u05D0\u05D5\u05DE\u05EA" });
  try {
    const { sub: userId } = decodeAccessToken(auth.slice(7));
    incrementTokenVersion(userId);
    clearCookie(res);
    return res.json({ message: "\u05D4\u05EA\u05E0\u05EA\u05E7\u05EA \u05DE\u05DB\u05DC \u05D4\u05DE\u05DB\u05E9\u05D9\u05E8\u05D9\u05DD" });
  } catch {
    return res.status(401).json({ detail: "Access token \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF" });
  }
});
authRouter.get("/me", (req, res) => {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return res.status(401).json({ detail: "\u05DC\u05D0 \u05DE\u05D0\u05D5\u05DE\u05EA" });
  try {
    const { sub: userId } = decodeAccessToken(auth.slice(7));
    const user = findAuthUserById(userId);
    if (!user) return res.status(404).json({ detail: "\u05DE\u05E9\u05EA\u05DE\u05E9 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0" });
    return res.json(formatUser(user));
  } catch {
    return res.status(401).json({ detail: "Access token \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF" });
  }
});
authRouter.post("/demo", (req, res) => {
  const user = getOrCreateDemoUser();
  const accessToken = issueSession(res, user);
  return res.json({ access_token: accessToken, user: formatUser(user) });
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

// server.ts
import_dotenv.default.config();
var DATA_DIR2 = import_path2.default.join(process.cwd(), "data");
if (!import_fs2.default.existsSync(DATA_DIR2)) {
  import_fs2.default.mkdirSync(DATA_DIR2, { recursive: true });
}
var USERS_FILE = import_path2.default.join(DATA_DIR2, "users.json");
function readUsersOnServer() {
  if (!import_fs2.default.existsSync(USERS_FILE)) {
    const demoProfile = {
      name: "\u05D9\u05E9\u05E8\u05D0\u05DC \u05D9\u05E9\u05E8\u05D0\u05DC\u05D9",
      netSalary: 16500,
      grossSalary: 22e3,
      salaryDay: 10,
      creditDay: 1,
      bankBalance: 24500,
      creditDebt: 4200,
      rent: 4800,
      rentDay: 1,
      hasKeren: true,
      kerenEmp: 2.5,
      kerenEr: 7.5,
      hasPension: true,
      pensionEmp: 6,
      pensionEr: 14.83,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const hashString = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      return hash.toString();
    };
    const demoAccount = {
      id: "demo_user_id",
      username: "demo",
      passwordHash: hashString("123456"),
      displayName: "\u05D9\u05E9\u05E8\u05D0\u05DC \u05D9\u05E9\u05E8\u05D0\u05DC\u05D9",
      email: "demo@finance.il",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      profile: demoProfile
    };
    const defaultBudgetPlan = [
      { key: "\u05D3\u05D9\u05D5\u05E8", pct: 30, color: "#64748B", emoji: "\u{1F3E0}" },
      { key: "\u05DE\u05D6\u05D5\u05DF \u05D5\u05E9\u05D5\u05E7", pct: 15, color: "#22C55E", emoji: "\u{1F6D2}" },
      { key: "\u05EA\u05D7\u05D1\u05D5\u05E8\u05D4", pct: 10, color: "#3B82F6", emoji: "\u{1F68C}" },
      { key: "\u05D7\u05E9\u05D1\u05D5\u05E0\u05D5\u05EA", pct: 8, color: "#EAB308", emoji: "\u{1F4A1}" },
      { key: "\u05D1\u05E8\u05D9\u05D0\u05D5\u05EA", pct: 5, color: "#14B8A6", emoji: "\u{1F3E5}" },
      { key: "\u05D1\u05D9\u05D3\u05D5\u05E8", pct: 7, color: "#EC4899", emoji: "\u{1F3AC}" },
      { key: "\u05D7\u05D9\u05E1\u05DB\u05D5\u05DF", pct: 15, color: "#F59E0B", emoji: "\u{1F4B0}" },
      { key: "\u05E9\u05D5\u05E0\u05D5\u05EA", pct: 10, color: "#9CA3AF", emoji: "\u{1F4E6}" }
    ];
    const demoData = {
      profile: demoProfile,
      transactions: [
        { id: 101, description: "\u05DE\u05E9\u05DB\u05D5\u05E8\u05EA \u05D7\u05D5\u05D3\u05E9\u05D9\u05EA", amount: 16500, date: "2026-07-10", cat: "\u05D4\u05DB\u05E0\u05E1\u05D4", color: "#10B981", emoji: "\u{1F4B0}", account: "\u05D1\u05E0\u05E7 \u05D4\u05E4\u05D5\u05E2\u05DC\u05D9\u05DD", auto: true },
        { id: 102, description: "\u05E9\u05DB\u05E8 \u05D3\u05D9\u05E8\u05D4 - \u05D9\u05D5\u05DC\u05D9", amount: -4800, date: "2026-07-01", cat: "\u05D3\u05D9\u05D5\u05E8", color: "#64748B", emoji: "\u{1F3E0}", account: "\u05D4\u05D5\u05E8\u05D0\u05EA \u05E7\u05D1\u05E2" },
        { id: 103, description: "\u05E9\u05D5\u05E4\u05E8\u05E1\u05DC \u05D3\u05D9\u05DC \u05E8\u05E2\u05E0\u05E0\u05D4", amount: -680, date: "2026-07-24", cat: "\u05E1\u05D5\u05E4\u05E8\u05DE\u05E8\u05E7\u05D8", color: "#22C55E", emoji: "\u{1F6D2}", account: "Max" },
        { id: 104, description: "\u05D5\u05D5\u05DC\u05D8 - \u05D2'\u05D9\u05E8\u05E3 \u05E1\u05D5\u05E9\u05D9", amount: -185, date: "2026-07-26", cat: "\u05DE\u05E1\u05E2\u05D3\u05D5\u05EA \u05D5\u05E7\u05E4\u05D4", color: "#F97316", emoji: "\u{1F37D}\uFE0F", account: "Max" },
        { id: 105, description: "\u05D7\u05D1\u05E8\u05EA \u05D4\u05D7\u05E9\u05DE\u05DC", amount: -340, date: "2026-07-15", cat: "\u05D7\u05E9\u05D1\u05D5\u05E0\u05D5\u05EA \u05D1\u05D9\u05EA", color: "#EAB308", emoji: "\u{1F4A1}", account: "\u05D1\u05E0\u05E7 \u05D4\u05E4\u05D5\u05E2\u05DC\u05D9\u05DD" },
        { id: 106, description: "\u05E4\u05D6 - \u05D3\u05DC\u05E7 \u05DE\u05EA\u05D7\u05DD \u05E9\u05E4\u05D9\u05D9\u05DD", amount: -290, date: "2026-07-20", cat: "\u05D3\u05DC\u05E7 \u05D5\u05E8\u05DB\u05D1", color: "#84CC16", emoji: "\u26FD", account: "Max" },
        { id: 107, description: "\u05E1\u05D5\u05E4\u05E8-\u05E4\u05D0\u05E8\u05DD \u05E7\u05E0\u05D9\u05D5\u05DF \u05E8\u05E0\u05E0\u05D9\u05DD", amount: -145, date: "2026-07-22", cat: "\u05D1\u05E8\u05D9\u05D0\u05D5\u05EA", color: "#14B8A6", emoji: "\u{1F3E5}", account: "Max" },
        { id: 108, description: "\u05E4\u05E8\u05D8\u05E0\u05E8 \u05EA\u05E7\u05E9\u05D5\u05E8\u05EA", amount: -120, date: "2026-07-05", cat: "\u05EA\u05E7\u05E9\u05D5\u05E8\u05EA", color: "#06B6D4", emoji: "\u{1F4F1}", account: "\u05D4\u05D5\u05E8\u05D0\u05EA \u05E7\u05D1\u05E2" },
        { id: 109, description: "\u05E0\u05D8\u05E4\u05DC\u05D9\u05E7\u05E1 \u05D7\u05D5\u05D3\u05E9\u05D9", amount: -65, date: "2026-07-03", cat: "\u05D1\u05D9\u05D3\u05D5\u05E8", color: "#EC4899", emoji: "\u{1F3AC}", account: "Max" },
        { id: 110, description: "\u05D6\u05D0\u05E8\u05D4 \u05E7\u05E0\u05D9\u05D5\u05DF \u05E2\u05D6\u05E8\u05D9\u05D0\u05DC\u05D9", amount: -390, date: "2026-07-18", cat: "\u05E7\u05E0\u05D9\u05D5\u05EA", color: "#F59E0B", emoji: "\u{1F6CD}\uFE0F", account: "Max" }
      ],
      budgetPlan: defaultBudgetPlan,
      investments: {
        kerenValue: 84500,
        kerenYTD: 6.8,
        pensionValue: 24e4,
        pensionYTD: 8.2,
        savings: [
          { id: 1, name: '\u05E4\u05E7"\u05DE \u05D7\u05D5\u05D3\u05E9\u05D9 \u05DE\u05EA\u05D7\u05D3\u05E9', bank: "\u05D1\u05E0\u05E7 \u05D4\u05E4\u05D5\u05E2\u05DC\u05D9\u05DD", value: 35e3, rate: 4.2 }
        ],
        moneyMarket: [
          { id: 101, name: "\u05DE\u05D2\u05D3\u05DC \u05E9\u05E7\u05DC\u05D9\u05DD \u05DB\u05E1\u05E4\u05D9\u05EA", value: 5e4, yield: 4.6 }
        ],
        portfolioHoldings: [
          { id: 201, symbol: "NVDA", name: "NVIDIA Corporation", shares: 25, avgCost: 110, color: "#22C55E" },
          { id: 202, symbol: "AAPL", name: "Apple Inc.", shares: 15, avgCost: 195, color: "#3B82F6" },
          { id: 203, symbol: "TEVA.TA", name: "Teva Pharmaceutical", shares: 300, avgCost: 14.5, color: "#8B5CF6" }
        ],
        portfolioCash: 2500,
        portfolioHistory: [
          { id: 1, type: "deposit", amount: 5e3, date: "2026-01-15" },
          { id: 2, type: "buy", symbol: "NVDA", shares: 25, price: 110, cost: 2750, date: "2026-02-10" }
        ]
      },
      snapshots: {
        kerenValue: [
          { date: "2026-01-01", value: 78e3 },
          { date: "2026-04-01", value: 81200 },
          { date: "2026-07-01", value: 84500 }
        ],
        pensionValue: [
          { date: "2026-01-01", value: 22e4 },
          { date: "2026-04-01", value: 231e3 },
          { date: "2026-07-01", value: 24e4 }
        ]
      }
    };
    import_fs2.default.writeFileSync(USERS_FILE, JSON.stringify([demoAccount], null, 2), "utf8");
    import_fs2.default.writeFileSync(import_path2.default.join(DATA_DIR2, "user_data_demo_user_id.json"), JSON.stringify(demoData, null, 2), "utf8");
    return [demoAccount];
  }
  try {
    return JSON.parse(import_fs2.default.readFileSync(USERS_FILE, "utf8"));
  } catch (e) {
    return [];
  }
}
function writeUsersOnServer(users) {
  import_fs2.default.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}
function readUserDataOnServer(userId) {
  const filePath = import_path2.default.join(DATA_DIR2, `user_data_${userId}.json`);
  if (!import_fs2.default.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(import_fs2.default.readFileSync(filePath, "utf8"));
  } catch (e) {
    return null;
  }
}
function writeUserDataOnServer(userId, data) {
  const filePath = import_path2.default.join(DATA_DIR2, `user_data_${userId}.json`);
  import_fs2.default.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}
async function startServer() {
  const app = (0, import_express2.default)();
  const PORT = 3e3;
  app.use(import_express2.default.json({ limit: "20mb" }));
  app.use((0, import_cookie_parser.default)());
  app.use("/auth", authRouter);
  app.use((req, res, next) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) return next();
    if (!req.path.startsWith("/api/")) return next();
    const pub = ["/api/health", "/api/forex", "/api/market-summary", "/api/stock-quote"];
    if (pub.some((p) => req.path.startsWith(p))) return next();
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) return res.status(401).json({ detail: "\u05DC\u05D0 \u05DE\u05D0\u05D5\u05DE\u05EA" });
    try {
      const payload = decodeAccessToken(auth.slice(7));
      req.userId = payload.sub;
      req.userEmail = payload.email;
      next();
    } catch {
      return res.status(401).json({ detail: "Token \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D0\u05D5 \u05E9\u05E4\u05D2 \u05EA\u05D5\u05E7\u05E4\u05D5" });
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
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
  function getGeminiApiKey(req) {
    let key = req.headers["x-gemini-api-key"] || req.body?.geminiApiKey;
    if (key && typeof key === "string") {
      key = key.trim();
    }
    if (key && key !== "undefined" && key !== "null" && key.length > 5) {
      return key;
    }
    return process.env.GEMINI_API_KEY;
  }
  async function generateGeminiContent(ai, params) {
    const modelsToTry = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
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
        console.warn(`Gemini model ${modelName} failed:`, e.message || e);
        lastError = e;
      }
    }
    throw lastError || new Error("\u05DB\u05DC \u05D3\u05D2\u05DE\u05D9 Gemini \u05E0\u05DB\u05E9\u05DC\u05D5 \u05D1\u05DE\u05E2\u05E0\u05D4");
  }
  app.post("/api/test-ai", async (req, res) => {
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
      console.error("Test AI Key Error:", e);
      return res.status(400).json({
        success: false,
        error: `\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D0\u05D9\u05DE\u05D5\u05EA \u05DE\u05E4\u05EA\u05D7: ${e.message || "\u05D4\u05DE\u05E4\u05EA\u05D7 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D0\u05D5 \u05D7\u05E1\u05D5\u05DD"}`
      });
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
      for (const host of hosts) {
        try {
          const url = `https://${host}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
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
  app.get("/api/auth/accounts", (req, res) => {
    try {
      const users = readUsersOnServer();
      const safeUsers = users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        createdAt: u.createdAt,
        profile: u.profile
      }));
      res.json(safeUsers);
    } catch (e) {
      res.status(500).json({ error: e.message || "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD" });
    }
  });
  app.post("/api/auth/register", (req, res) => {
    try {
      const { account, initData } = req.body;
      if (!account || !account.username) {
        return res.status(400).json({ error: "\u05E0\u05EA\u05D5\u05E0\u05D9 \u05D7\u05E9\u05D1\u05D5\u05DF \u05D7\u05E1\u05E8\u05D9\u05DD" });
      }
      const users = readUsersOnServer();
      const exists = users.some((u) => u.username.toLowerCase() === account.username.toLowerCase());
      if (exists) {
        return res.status(400).json({ error: "\u05E9\u05DD \u05D4\u05DE\u05E9\u05EA\u05DE\u05E9 \u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD \u05D1\u05E9\u05E8\u05EA" });
      }
      users.push(account);
      writeUsersOnServer(users);
      if (initData) {
        writeUserDataOnServer(account.id, initData);
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message || "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E8\u05D9\u05E9\u05D5\u05DD \u05DE\u05E9\u05EA\u05DE\u05E9 \u05D1\u05E9\u05E8\u05EA" });
    }
  });
  app.get("/api/user/load/:userId", (req, res) => {
    try {
      const userId = req.params.userId;
      const data = readUserDataOnServer(userId);
      if (!data) {
        return res.status(404).json({ error: "\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E2\u05D1\u05D5\u05E8 \u05DE\u05E9\u05EA\u05DE\u05E9 \u05D6\u05D4" });
      }
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message || "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD" });
    }
  });
  app.post("/api/user/save", (req, res) => {
    try {
      const { userId, data } = req.body;
      if (!userId || !data) {
        return res.status(400).json({ error: "\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D7\u05E1\u05E8\u05D9\u05DD \u05DC\u05E9\u05DE\u05D9\u05E8\u05D4" });
      }
      writeUserDataOnServer(userId, data);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message || "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express2.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
