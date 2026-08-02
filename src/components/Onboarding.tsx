import React, { useState } from 'react';
import { UserProfile } from '../types';
import { calcBudget } from '../utils/categories';
import { fmtILS } from '../utils/formatters';
import { Wallet, DollarSign, Calendar, Home, Check, ArrowRight, Sparkles } from 'lucide-react';

interface OnboardingProps {
  initialProfile: UserProfile;
  onDone: (profile: UserProfile) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ initialProfile, onDone }) => {
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 5;

  // Strip email-derived names (contain @ or no spaces and look like usernames)
  const initialName = initialProfile.name && !initialProfile.name.includes('@') && initialProfile.name.includes(' ')
    ? initialProfile.name
    : '';

  const [d, setD] = useState({
    name: initialName,
    netSalary: initialProfile.netSalary ? String(initialProfile.netSalary) : '',
    grossSalary: initialProfile.grossSalary ? String(initialProfile.grossSalary) : '',
    salaryDay: initialProfile.salaryDay || 10,
    creditDay: initialProfile.creditDay || 1,
    bankBalance: initialProfile.bankBalance ? String(initialProfile.bankBalance) : '',
    creditDebt: initialProfile.creditDebt ? String(initialProfile.creditDebt) : '',
    rent: initialProfile.rent ? String(initialProfile.rent) : '',
    rentDay: initialProfile.rentDay || 1,
    hasKeren: initialProfile.hasKeren ?? false,
    hasPension: initialProfile.hasPension ?? false,
  });

  const set = (key: string, value: any) => {
    setD((prev) => ({ ...prev, [key]: value }));
  };

  const finish = () => {
    const profile: UserProfile = {
      ...initialProfile,
      name: d.name.trim() || 'משתמש',
      netSalary: parseFloat(d.netSalary) || 0,
      grossSalary: parseFloat(d.grossSalary) || 0,
      salaryDay: parseInt(String(d.salaryDay), 10) || 10,
      creditDay: parseInt(String(d.creditDay), 10) || 1,
      bankBalance: parseFloat(d.bankBalance) || 0,
      creditDebt: parseFloat(d.creditDebt) || 0,
      rent: parseFloat(d.rent) || 0,
      rentDay: parseInt(String(d.rentDay), 10) || 1,
      hasKeren: d.hasKeren,
      hasPension: d.hasPension,
    };
    onDone(profile);
  };

  const next = () => (step < TOTAL_STEPS ? setStep((s) => s + 1) : finish());
  const back = () => setStep((s) => s - 1);

  const netNum = parseFloat(d.netSalary) || 0;
  const budgetAllocation = calcBudget(netNum, []);

  return (
    <div className="min-h-dvh bg-slate-950 flex flex-col items-center p-4 py-8 relative overflow-x-clip overflow-y-auto">
      <div className="w-full max-w-lg my-auto">
        {/* Step Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-2 font-medium">
            <span>שלב {step} מתוך {TOTAL_STEPS}</span>
            <span>הגדרת חשבון אישית</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Card Content */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {step === 1 && (
            <div className="animate-fade-in space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl font-bold mb-2">
                👋
              </div>
              <h2 className="text-2xl font-bold text-white text-right">ברוך הבא! מה השם שלך?</h2>
              <p className="text-slate-400 text-sm text-right">נשמח להכיר אותך כדי להתאים את הדשבורד האישי.</p>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 mb-2 text-right">שם פרטי</label>
                <input
                  type="text"
                  value={d.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="ישראל ישראלי"
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none text-right"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-2xl font-bold mb-2">
                💰
              </div>
              <h2 className="text-2xl font-bold text-white text-right">שכר ומועדי חיוב</h2>
              <p className="text-slate-400 text-sm text-right">נתונים אלו משמשים לחישוב התקציב היומי ומעקב אוטומטי.</p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 text-right">שכר נטו בחודש (₪)</label>
                  <input
                    type="number"
                    value={d.netSalary}
                    onChange={(e) => set('netSalary', e.target.value)}
                    placeholder="15000"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none text-right font-num"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-emerald-400 mb-1 text-right">יום כניסת משכורת</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={d.salaryDay}
                      onChange={(e) => set('salaryDay', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none text-right font-num"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-red-400 mb-1 text-right">יום חיוב אשראי</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={d.creditDay}
                      onChange={(e) => set('creditDay', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none text-right font-num"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl font-bold mb-2">
                🏠
              </div>
              <h2 className="text-2xl font-bold text-white text-right">הוצאה קבועה ראשית</h2>
              <p className="text-slate-400 text-sm text-right">שכר דירה או משכנתה חודשית שנורדת באופן קבוע.</p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 text-right">סכום שכר דירה / משכנתה (₪)</label>
                  <input
                    type="number"
                    value={d.rent}
                    onChange={(e) => set('rent', e.target.value)}
                    placeholder="4500"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none text-right font-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 text-right">יום ירידת התשלום</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={d.rentDay}
                    onChange={(e) => set('rentDay', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none text-right font-num"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-2xl font-bold mb-2">
                🏦
              </div>
              <h2 className="text-2xl font-bold text-white text-right">יתרות פתיחה</h2>
              <p className="text-slate-400 text-sm text-right">יתרת העו"ש בבנק כרגע וחוב האשראי הנוכחי.</p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 text-right">יתרה בבנק (עו"ש) ₪</label>
                  <input
                    type="number"
                    value={d.bankBalance}
                    onChange={(e) => set('bankBalance', e.target.value)}
                    placeholder="10000"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none text-right font-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 text-right">חוב אשראי נוכחי ₪ (אם יש)</label>
                  <input
                    type="number"
                    value={d.creditDebt}
                    onChange={(e) => set('creditDebt', e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none text-right font-num"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-fade-in space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl font-bold mb-2">
                🚀
              </div>
              <h2 className="text-2xl font-bold text-white text-right">הכל מוכן, {d.name || 'חבר'}!</h2>
              <p className="text-slate-400 text-sm text-right">הנה חלוקת התקציב המומלצת לפי השכר שלך ({fmtILS(netNum)}):</p>

              <div className="space-y-2 pt-2 max-h-52 overflow-y-auto pr-1">
                {budgetAllocation.map((b) => (
                  <div
                    key={b.key}
                    className="flex justify-between items-center gap-3 bg-slate-950 p-2.5 rounded-xl text-xs border border-slate-800"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="shrink-0">{b.emoji}</span>
                      <span className="text-slate-300 font-medium truncate">{b.key}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-white font-num">{fmtILS(b.amount)}</span>
                      <span className="text-slate-500">({b.pct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation controls */}
          <div className="flex gap-3 pt-6 mt-4 border-t border-slate-800/80">
            {step > 1 && (
              <button
                type="button"
                onClick={back}
                className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm rounded-xl transition-all cursor-pointer"
              >
                חזור
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="flex-1 py-3 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{step === TOTAL_STEPS ? 'התחל שימוש ✨' : 'הבא'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
