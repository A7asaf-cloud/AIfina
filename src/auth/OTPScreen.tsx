import { useState, useEffect, useRef, useCallback, type KeyboardEvent, type ClipboardEvent } from 'react';
import { useAuth, AuthUser } from './AuthContext';
import { ArrowRight } from 'lucide-react';

const EXPIRE_SEC = 600;
const RESEND_SEC = 60;

interface Props {
  email: string;
  onBack: () => void;
}

export default function OTPScreen({ email, onBack }: Props) {
  const { applySession }                = useAuth();
  const [digits, setDigits]             = useState<string[]>(['','','','','','']);
  const [timeLeft, setTimeLeft]         = useState(EXPIRE_SEC);
  const [resendCD, setResendCD]         = useState(RESEND_SEC);
  const [verifying, setVerifying]       = useState(false);
  const [resending, setResending]       = useState(false);
  const [error, setError]               = useState('');
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!resendCD) return;
    const t = setInterval(() => setResendCD(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCD]);

  const verify = useCallback(async (code: string) => {
    setVerifying(true); setError('');
    try {
      const res = await fetch('/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `שגיאה ${res.status}`);
      applySession(data.access_token, data.user as AuthUser);
    } catch (err: any) {
      setError(err.message);
      setDigits(['','','','','','']);
      setTimeout(() => refs.current[0]?.focus(), 50);
    } finally { setVerifying(false); }
  }, [email, applySession]);

  useEffect(() => {
    if (digits.every(d => d !== '')) verify(digits.join(''));
  }, [digits, verify]);

  function onChange(i: number, v: string) {
    if (!/^\d?$/.test(v)) return;
    const n = [...digits]; n[i] = v; setDigits(n);
    if (v && i < 5) refs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: KeyboardEvent) {
    if (e.key === 'Backspace') {
      if (digits[i]) { const n=[...digits]; n[i]=''; setDigits(n); }
      else if (i > 0) { refs.current[i-1]?.focus(); const n=[...digits]; n[i-1]=''; setDigits(n); }
    } else if (e.key === 'ArrowRight' && i > 0) refs.current[i-1]?.focus();
    else if   (e.key === 'ArrowLeft'  && i < 5) refs.current[i+1]?.focus();
  }

  function onPaste(e: ClipboardEvent) {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (!p) return;
    const n = ['','','','','','']; for (let i=0;i<p.length;i++) n[i]=p[i];
    setDigits(n); refs.current[Math.min(p.length,5)]?.focus();
  }

  async function resend() {
    if (resendCD || resending) return;
    setResending(true); setError('');
    try {
      const res = await fetch('/auth/otp/request', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'שגיאה');
      setDigits(['','','','','','']); setTimeLeft(EXPIRE_SEC); setResendCD(RESEND_SEC);
      setTimeout(() => refs.current[0]?.focus(), 50);
    } catch (err: any) { setError(err.message); }
    finally { setResending(false); }
  }

  const mm = String(Math.floor(timeLeft/60)).padStart(2,'0');
  const ss = String(timeLeft%60).padStart(2,'0');

  return (
    <div className="min-h-dvh bg-surface flex flex-col items-center p-4 py-8 relative overflow-x-clip overflow-y-auto" dir="rtl">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-income/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 my-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-income to-income text-white shadow-lg shadow-income/20 mb-4">
            <span className="text-3xl">📧</span>
          </div>
          <h1 className="text-2xl font-black text-ink">בדוק את האימייל שלך</h1>
          <p className="text-muted text-sm mt-2">
            שלחנו קוד 6 ספרות אל<br />
            <span className="text-ink font-medium" dir="ltr">{email}</span>
          </p>
        </div>

        <div className="bg-card border border-line rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex gap-1.5 sm:gap-2 justify-center mb-5" dir="ltr" onPaste={onPaste}>
            {digits.map((d, i) => (
              <input key={i}
                ref={el => (refs.current[i] = el)}
                type="text" inputMode="numeric" maxLength={1} value={d}
                aria-label={`ספרת אימות ${i + 1}`}
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                onChange={e => onChange(i, e.target.value)}
                onKeyDown={e => onKeyDown(i, e)}
                autoFocus={i === 0}
                className={`min-w-0 flex-1 max-w-12 h-12 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-xl sm:rounded-2xl border bg-surface text-ink transition outline-none
                  ${d ? 'border-income text-income' : 'border-line'}
                  ${error ? 'border-expense' : ''}
                  focus:border-income`}
              />
            ))}
          </div>

          {error && (
            <div className="bg-expense/10 border border-expense/20 text-expense text-xs p-3 rounded-xl text-center mb-3">
              {error}
            </div>
          )}

          <p className={`text-center text-sm mb-4 tabular-nums ${timeLeft < 60 ? 'text-expense' : 'text-muted'}`} dir="ltr">
            {timeLeft > 0 ? `הקוד תקף עוד ${mm}:${ss}` : 'הקוד פג תוקף'}
          </p>

          <button
            onClick={() => verify(digits.join(''))}
            disabled={verifying || digits.some(d => !d)}
            className="w-full py-3 px-4 bg-primary hover:bg-primary/90 disabled:opacity-40 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg cursor-pointer mb-4"
          >
            {verifying ? 'מאמת...' : 'אמת קוד'}
          </button>

          <p className="text-center text-sm text-muted">
            לא קיבלת?{' '}
            <button onClick={resend} disabled={resendCD > 0 || resending}
              className="text-primary hover:text-primary/80 disabled:text-muted disabled:opacity-40 disabled:cursor-not-allowed transition">
              {resendCD > 0 ? `שלח שוב בעוד ${resendCD}ש` : resending ? 'שולח...' : 'שלח שוב'}
            </button>
          </p>
        </div>

        <button onClick={onBack}
          aria-label="חזרה למסך ההתחברות"
          className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-muted hover:text-ink transition">
          <ArrowRight className="w-4 h-4" />
          חזור
        </button>
      </div>
    </div>
  );
}
