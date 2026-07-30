import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Mail, Chrome } from 'lucide-react';
import { useAuth, AuthUser } from './AuthContext';
import OTPScreen from './OTPScreen';

export default function AuthPage() {
  const { applySession } = useAuth();
  const [stage, setStage]           = useState<'entry' | 'otp'>('entry');
  const [emailInput, setEmailInput] = useState('');
  const [email, setEmail]           = useState('');
  const [sending, setSending]       = useState(false);
  const [error, setError]           = useState('');
  const [demoLoading, setDemoLoading] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const addr = emailInput.trim().toLowerCase();
    if (!addr.includes('@')) { setError('הזן כתובת אימייל תקינה'); return; }
    setSending(true); setError('');
    try {
      const res = await fetch('/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `שגיאה ${res.status}`);
      setEmail(addr);
      setStage('otp');
    } catch (err: any) {
      setError(err.message);
    } finally { setSending(false); }
  }

  async function handleDemo() {
    setDemoLoading(true);
    try {
      const res = await fetch('/auth/demo', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'שגיאה');
      applySession(data.access_token, data.user as AuthUser);
    } catch (err: any) {
      setError(err.message);
    } finally { setDemoLoading(false); }
  }

  if (stage === 'otp') return <OTPScreen email={email} onBack={() => setStage('entry')} />;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/20 mb-4">
            <span className="text-3xl">💎</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">FinanceIL</h1>
          <p className="text-slate-400 text-sm mt-1">ניהול תזרים מזומנים ותקציב חכם</p>
        </div>

        {/* Demo card */}
        <div className="mb-5 bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>כניסה מיידית ללא התעסקות!</span>
              </div>
              <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                רוצה לראות את האפליקציה בפעולה? התחבר בלחיצה אחת לחשבון הדמו המוכנה מראש.
              </p>
            </div>
          </div>
          <button onClick={handleDemo} disabled={demoLoading} type="button"
            className="mt-3 w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer">
            {demoLoading ? 'טוען...' : (
              <>
                <span>כניסה מהירה (חשבון הדגמה)</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </>
            )}
          </button>
        </div>

        {/* Auth card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Google */}
          <button
            onClick={() => { window.location.href = '/auth/google'; }}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-sm py-3 rounded-2xl transition mb-4"
          >
            <GoogleIcon />
            המשך עם Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-600">או</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Email OTP */}
          <form onSubmit={handleSend} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">כתובת אימייל</label>
              <input
                type="email"
                value={emailInput}
                onChange={e => { setEmailInput(e.target.value); setError(''); }}
                placeholder="you@example.com"
                autoComplete="email"
                dir="ltr"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors text-left"
              />
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl">{error}</div>
            )}
            <button type="submit" disabled={sending}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-white text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              {sending ? 'שולח...' : 'שלח קוד אימות'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-slate-500 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>כניסה מאובטחת עם JWT — ללא סיסמאות</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
