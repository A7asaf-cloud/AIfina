import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import { UserAccount } from '../types';
import { Lock, User, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (account: UserAccount) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!username.trim() || password.length < 4) {
          setError('אנא הזן שם משתמש וסיסמה של לפחות 4 תווים');
          setLoading(false);
          return;
        }
        const account = StorageService.registerAccount(username, password, displayName);
        onSuccess(account);
      } else {
        if (!username.trim() || !password) {
          setError('אנא הזן שם משתמש וסיסמה');
          setLoading(false);
          return;
        }
        const account = StorageService.login(username, password);
        onSuccess(account);
      }
    } catch (err: any) {
      setError(err.message || 'שגיאה בתהליך ההתחברות');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setLoading(true);
    setTimeout(() => {
      const demoAccount = StorageService.loginAsDemo();
      onSuccess(demoAccount);
    }, 200);
  };

  return (
    <div className="min-h-dvh bg-slate-950 flex flex-col items-center p-4 py-8 relative overflow-x-clip overflow-y-auto">
      {/* Background ambient lighting glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 my-auto">
        {/* Brand Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/20 mb-4">
            <span className="text-3xl font-extrabold">💎</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">FinanceIL</h1>
          <p className="text-slate-400 text-sm mt-1">ניהול תזרים מזומנים ותקציב חכם</p>
        </div>

        {/* Quick Demo Instant Access Banner */}
        <div className="mb-6 bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-xl text-right animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>כניסה מיידית ללא התעסקות!</span>
              </div>
              <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                רוצה לראות את האפליקציה בפעולה? התחבר בלחיצה אחת לחשבון הדמו המוכנה מראש.
              </p>
            </div>
          </div>
          <button
            onClick={handleQuickDemo}
            disabled={loading}
            type="button"
            className="mt-3 w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>כניסה מהירה (חשבון הדגמה)</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
        </div>

        {/* Auth Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-950/80 p-1 rounded-2xl mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              התחברות
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              הרשמה חדשה
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-right">
                  שם מלא
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="ישראל ישראלי"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors text-right"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-right">
                שם משתמש
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="הזן שם משתמש"
                  required
                  autoCapitalize="none"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors text-right"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-right">
                סיסמה
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors text-right"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl text-right">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-white text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg cursor-pointer mt-2"
            >
              {loading ? 'מאמת פרטים...' : mode === 'login' ? 'התחבר למערכת' : 'צור חשבון חדש'}
            </button>
          </form>

          {/* Security note */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-slate-500 text-xs text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>הנתונים נשמרים מקומית בדפדפן בבטחה</span>
          </div>
        </div>
      </div>
    </div>
  );
};
