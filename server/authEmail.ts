import nodemailer from 'nodemailer';

export async function sendOtpEmail(toEmail: string, code: string): Promise<void> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;

  if (!host || !user) {
    console.warn(`[DEV] OTP for ${toEmail}: ${code}  (SMTP לא מוגדר — מודפס ל-log)`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user, pass: process.env.SMTP_PASS || '' },
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
            <span style="font-size:28px">💎</span>
            <span style="color:#10b981;font-size:18px;font-weight:800">FinanceIL</span>
          </div>
          <div style="color:#cbd5e1;font-size:14px;margin-bottom:20px">קוד האימות שלך:</div>
          <div style="background:#020617;border:1px solid #1e293b;border-radius:12px;
                      padding:20px;text-align:center;margin-bottom:24px;direction:ltr">
            <span style="font-size:38px;font-weight:700;letter-spacing:14px;color:#fff;font-family:monospace">
              ${code}
            </span>
          </div>
          <div style="color:#475569;font-size:12px;line-height:1.6">
            הקוד תקף ל-<strong style="color:#64748b">10 דקות</strong>.
            אם לא ביקשת להתחבר, ניתן להתעלם מהודעה זו.
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
    subject: 'קוד האימות שלך - FinanceIL',
    text: `קוד האימות שלך ל-FinanceIL הוא: ${code}\n\nהקוד תקף ל-10 דקות.`,
    html,
  });
}
