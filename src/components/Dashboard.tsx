import React, { useState, useMemo } from 'react';
import { UserProfile, Transaction, BudgetPlanItem, StockHolding } from '../types';
import { calcBudget, spentPerBudget } from '../utils/categories';
import { fmtILS, fmtUSD, fmtDate, daysUntil } from '../utils/formatters';
import { AddTransactionModal } from './AddTransactionModal';
import { generateGeminiContentClient } from '../utils/apiFallback';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Plus,
  ArrowUpRight,
  ChevronLeft,
  AlertCircle,
  PieChart,
} from 'lucide-react';

interface DashboardProps {
  profile: UserProfile;
  transactions: Transaction[];
  budgetPlan: BudgetPlanItem[];
  holdings: StockHolding[];
  portfolioCash: number;
  onAddTransaction: (tx: Transaction) => void;
  onUpdateCategory: (txId: string | number, newCat: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  profile,
  transactions,
  budgetPlan,
  holdings,
  portfolioCash,
  onAddTransaction,
  onUpdateCategory,
  onNavigateToTab,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchAiInsights = async () => {
    setAiLoading(true);
    setAiError(null);
    
    // Construct local prompt text in case we need client-side generation
    const catTotals: Record<string, number> = {};
    transactions
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        catTotals[t.cat] = (catTotals[t.cat] || 0) + Math.abs(t.amount);
      });
    const topCategories = Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amt]) => ({ category: cat, amount: amt }));

    const localPromptText = `אתה יועץ פיננסי אישי וחכם. נתח את הנתונים הפיננסיים של המשתמש:
- משכורת נטו: ₪${net}
- הכנסות החודש: ₪${monthIncome}
- הוצאות החודש: ₪${monthExpense}
- יתרה פנויה לתקציב: ₪${safeToSpend}
- שווי תיק השקעות: $${stockPortfolioVal + portfolioCash}
- קטגוריות מובילות: ${JSON.stringify(topCategories)}

תן 3 תובנות/המלצות פיננסיות קצרות, ממוקדות ומעשיות בעברית.
החזר אך ורק JSON תקין במבנה הבא ללא markdown:
{"insights":["תובנה 1", "תובנה 2", "תובנה 3"]}`;

    const handleClientFallback = async (key: string) => {
      if (!key) throw new Error('מפתח GEMINI_API_KEY חסר. הגדר אותו תחילה בהגדרות.');
      const text = await generateGeminiContentClient(key, [
        { role: 'user', parts: [{ text: localPromptText }] }
      ]);
      let cleanedText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = cleanedText.indexOf('{');
      const lastBrace = cleanedText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonResult = JSON.parse(cleanedText.substring(firstBrace, lastBrace + 1));
        return jsonResult.insights || [];
      }
      return [text];
    };

    try {
      const customKey = localStorage.getItem('fil_gemini_api_key') || '';
      if (!customKey) {
        setAiError('מפתח GEMINI_API_KEY חסר. הגדר אותו תחילה בהגדרות.');
        return;
      }
      const insights = await handleClientFallback(customKey);
      setAiInsights(insights);
    } catch (err: any) {
      setAiError(err.message || 'שגיאה בחיבור לשרת ה-AI');
    } finally {
      setAiLoading(false);
    }
  };

  const net = profile.netSalary || 0;
  const budget = useMemo(() => calcBudget(net, budgetPlan), [net, budgetPlan]);

  const now = new Date();

  // Billing period: from creditDay last month (or this month if today >= creditDay)
  const creditDay = profile.creditDay || 1;
  const today = now.getDate();
  const billingStart =
    today >= creditDay
      ? new Date(now.getFullYear(), now.getMonth(), creditDay)
      : new Date(now.getFullYear(), now.getMonth() - 1, creditDay);

  const spent = useMemo(() => spentPerBudget(transactions, budget, billingStart), [transactions, budget]); // eslint-disable-line

  // Income: calendar month (salary-based)
  const currentMonthTxs = transactions.filter((t) => {
    const d = new Date(t.date);
    return (
      !isNaN(d.getTime()) &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  });

  const monthIncome = currentMonthTxs
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);

  // Expenses: billing period (matches credit card accumulation)
  const billingPeriodExpenses = transactions.filter((t) => {
    const d = new Date(t.date);
    return !isNaN(d.getTime()) && d >= billingStart && t.amount < 0;
  });

  const monthExpense = Math.abs(
    billingPeriodExpenses.reduce((s, t) => s + t.amount, 0)
  );

  const creditCardAccumulated = monthExpense;

  const safeToSpend = Math.max(0, net - monthExpense);
  const spendRatio = net > 0 ? safeToSpend / net : 1;

  let spendColorClass = 'text-emerald-400';
  let cardBgGradient = 'from-emerald-950/80 via-slate-900 to-slate-950';
  if (spendRatio < 0.2) {
    spendColorClass = 'text-red-400';
    cardBgGradient = 'from-red-950/80 via-slate-900 to-slate-950';
  } else if (spendRatio < 0.5) {
    spendColorClass = 'text-amber-400';
    cardBgGradient = 'from-amber-950/80 via-slate-900 to-slate-950';
  }

  const daysToSalary = daysUntil(profile.salaryDay || 10);
  const daysToCredit = daysUntil(profile.creditDay || 1);

  const stockPortfolioVal = holdings.reduce(
    (s, h) => s + h.shares * (h.avgCost || 0),
    0
  );

  const recentTxs = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-4 text-right animate-fade-in">
      {/* Hero Card: Safe To Spend */}
      <div
        className={`bg-gradient-to-br ${cardBgGradient} border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden`}
      >
        {/* Greeting */}
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-400 mb-0.5">
              שלום {profile.name} 👋
            </p>
            <p className="text-xs text-slate-500 mb-3">יתרה פנויה לתקציב החודש</p>
            <h2 className={`text-3xl sm:text-4xl font-black ${spendColorClass} font-num tracking-tight leading-none`}>
              {fmtILS(safeToSpend)}
            </h2>
          </div>
          <div className="p-2.5 bg-slate-800/80 border border-slate-700/50 rounded-2xl text-slate-300 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Income vs Expense */}
        <div className="grid grid-cols-2 gap-2.5 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>הכנסות</span>
            </div>
            <div className="text-sm font-bold text-white font-num">
              {fmtILS(monthIncome || net)}
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>הוצאות</span>
            </div>
            <div className="text-sm font-bold text-white font-num">
              {fmtILS(monthExpense)}
            </div>
          </div>
        </div>
      </div>

      {/* Countdown Timers Strip */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-[11px] text-emerald-400 font-bold">💰 משכורת</span>
          </div>
          <div className="text-sm font-extrabold text-white leading-snug">
            {daysToSalary === 0 ? 'נכנסת היום! 🎉' : `בעוד ${daysToSalary} ימים`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">כל ה-{profile.salaryDay} בחודש</div>
        </div>

        <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-[11px] text-red-400 font-bold">💳 אשראי</span>
          </div>
          <div className="text-sm font-extrabold text-white leading-snug">
            {daysToCredit === 0 ? 'חיוב היום! ⚠️' : `בעוד ${daysToCredit} ימים`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">צבור: {fmtILS(creditCardAccumulated)}</div>
        </div>
      </div>

      {/* Quick Investments Banner */}
      {holdings.length > 0 && (
        <div
          onClick={() => onNavigateToTab('investments')}
          className="bg-gradient-to-r from-slate-900 to-indigo-950/60 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-indigo-500/50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              📈
            </div>
            <div>
              <div className="text-xs text-indigo-300 font-semibold">תיק מניות והשקעות</div>
              <div className="text-sm font-black text-white font-num">
                {fmtUSD(stockPortfolioVal + portfolioCash)}
              </div>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-indigo-400" />
        </div>
      )}

      {/* AI Financial Insights Card */}
      <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={fetchAiInsights}
            disabled={aiLoading}
            className="shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            {aiLoading ? (
              <>
                <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                <span>מנתח...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>{aiInsights ? 'רענן' : 'קבל ניתוח AI'}</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-lg">🤖</span>
            <h3 className="text-sm font-bold text-white truncate">תובנות פיננסיות</h3>
            <span className="text-indigo-400 text-[10px] px-1.5 py-0.5 bg-indigo-500/20 rounded-full border border-indigo-500/30 shrink-0">
              Gemini AI
            </span>
          </div>
        </div>

        {aiError && (
          <div className="text-xs text-red-400 bg-red-950/40 p-3 rounded-2xl border border-red-800/50">
            {aiError}
          </div>
        )}

        {aiInsights ? (
          <div className="space-y-2 pt-1 animate-fade-in">
            {aiInsights.map((insight, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 border border-indigo-500/20 p-3 rounded-2xl text-xs text-slate-200 leading-relaxed flex items-start gap-2"
              >
                <span className="text-indigo-400 font-bold shrink-0 mt-0.5">#{idx + 1}</span>
                <span>{insight}</span>
              </div>
            ))}
          </div>
        ) : (
          !aiLoading && (
            <p className="text-xs text-slate-400 leading-relaxed">
              לחץ על הכפתור כדי לקבל 3 תובנות והמלצות פיננסיות מותאמות אישית מאלגוריתם ה-Gemini AI בהתבסס על ההכנסות וההוצאות שלכם החודש.
            </p>
          )
        )}
      </div>

      {/* Budget Allocation Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <button
            onClick={() => onNavigateToTab('settings')}
            className="text-xs text-emerald-400 hover:underline font-bold"
          >
            ערוך תקציב
          </button>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>תקציב חודשי לפי קטגוריות</span>
            <PieChart className="w-4 h-4 text-emerald-400" />
          </h3>
        </div>

        <div className="space-y-4">
          {budget.map((b) => {
            const currentSpent = spent[b.key] || 0;
            const pct = Math.min(100, b.amount ? (currentSpent / b.amount) * 100 : 0);
            const isOver = currentSpent > b.amount;

            return (
              <div key={b.key} className="space-y-1.5">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300 shrink-0">
                    {b.emoji} {b.key}
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isOver && (
                      <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-lg text-[10px] font-bold shrink-0">
                        חריגה!
                      </span>
                    )}
                    <span className={`text-[11px] font-num truncate ${isOver ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                      {fmtILS(currentSpent)} / {fmtILS(b.amount)}
                    </span>
                  </div>
                </div>
                <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: isOver ? '#EF4444' : b.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex justify-between items-center">
          <button
            onClick={() => onNavigateToTab('transactions')}
            className="text-xs text-emerald-400 hover:underline font-bold"
          >
            לכל העסקאות ({transactions.length})
          </button>
          <h3 className="text-base font-bold text-white">עסקאות אחרונות</h3>
        </div>

        {recentTxs.length === 0 ? (
          <div className="text-center text-slate-500 py-8 text-sm">
            אין עסקאות עדיין — לייבא קובץ אקסל או להוסיף בלחיצה על (+)
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {recentTxs.map((tx) => {
              const isIncome = tx.amount > 0;
              return (
                <div key={tx.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-base flex-shrink-0"
                      style={{ backgroundColor: tx.color + '20' }}
                    >
                      {tx.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white truncate leading-snug">
                        {tx.description}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-slate-500">{fmtDate(tx.date)}</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold truncate max-w-[80px]"
                          style={{ backgroundColor: tx.color + '20', color: tx.color }}
                        >
                          {tx.cat}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`text-sm font-bold font-num flex-shrink-0 ${isIncome ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {isIncome ? '+' : ''}{fmtILS(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Plus Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-20 left-5 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xl shadow-emerald-500/30 flex items-center justify-center font-black text-2xl z-40 transition-transform active:scale-95 cursor-pointer"
      >
        <Plus className="w-7 h-7" />
      </button>

      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onAdd={onAddTransaction}
        />
      )}
    </div>
  );
};
