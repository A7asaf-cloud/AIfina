import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { UserProfile, Transaction, BudgetPlanItem, StockHolding, StandingOrder } from '../types';
import { calcBudget, spentPerBudget } from '../utils/categories';
import { fmtILS, fmtDate, daysUntil, todayLabelHe } from '../utils/formatters';
import { AddTransactionModal } from './AddTransactionModal';
import { generateGeminiContentClient } from '../utils/apiFallback';
import { Card, SectionTitle, Button, ProgressBar, Skeleton, showToastError } from './ui';
import { Bell, Plus, Calendar, CreditCard, RefreshCw } from 'lucide-react';

interface DashboardProps {
  profile: UserProfile;
  transactions: Transaction[];
  budgetPlan: BudgetPlanItem[];
  holdings: StockHolding[];
  portfolioCash: number;
  standingOrders: StandingOrder[];
  onAddTransaction: (tx: Transaction) => void;
  onUpdateCategory: (txId: string | number, newCat: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  profile, transactions, budgetPlan, holdings, portfolioCash, standingOrders,
  onAddTransaction, onUpdateCategory, onNavigateToTab,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const net = profile.netSalary || 0;
  const budget = useMemo(() => calcBudget(net, budgetPlan), [net, budgetPlan]);
  const now = new Date();
  const creditDay = profile.creditDay || 1;
  const today = now.getDate();
  const billingStart = today >= creditDay
    ? new Date(now.getFullYear(), now.getMonth(), creditDay)
    : new Date(now.getFullYear(), now.getMonth() - 1, creditDay);
  const spent = useMemo(() => spentPerBudget(transactions, budget, billingStart), [transactions, budget]);

  const currentMonthTxs = transactions.filter(t => {
    const d = new Date(t.date);
    return !isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthIncome = currentMonthTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const billingPeriodExpenses = transactions.filter(t => {
    const d = new Date(t.date);
    return !isNaN(d.getTime()) && d >= billingStart && t.amount < 0;
  });
  const monthExpense = Math.abs(billingPeriodExpenses.reduce((s, t) => s + t.amount, 0));
  const safeToSpend = Math.max(0, net - monthExpense);
  const expensePct = net > 0 ? Math.min(100, (monthExpense / net) * 100) : 0;
  const incomePct = 100 - expensePct;

  const daysToSalary = daysUntil(profile.salaryDay || 10);
  const daysToCredit = daysUntil(profile.creditDay || 1);
  const stockVal = holdings.reduce((s, h) => s + h.shares * (h.currentPrice || h.avgCost || 0), 0);
  const stockCost = holdings.reduce((s, h) => s + h.shares * (h.avgCost || 0), 0);
  const stockGain = stockVal - stockCost;
  const recentTxs = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  const topCats = (Object.entries(spent) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const fetchAiInsight = async () => {
    setAiLoading(true);
    try {
      const prompt = `אתה יועץ פיננסי. תן תובנה אחת קצרה, ממוקדת ומעשית בעברית. נתוני המשתמש: משכורת ₪${net}, הוצאות ₪${monthExpense}, יתרה ₪${safeToSpend}. החזר JSON: {"insight":"..."}`;
      const customKey = localStorage.getItem('fil_gemini_api_key') || '';
      const text = await generateGeminiContentClient(customKey, [{ role: 'user', parts: [{ text: prompt }] }]);
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const json = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
        setAiInsight(json.insight || json.insights?.[0] || text);
      } else {
        setAiInsight(text);
      }
    } catch (err: any) {
      showToastError(err.message || 'שגיאה בקבלת תובנה');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-5 pb-4 text-right animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-ink">שלום, {profile.name}! 👋</h1>
          <p className="text-sm text-muted">{todayLabelHe()}</p>
        </div>
        <div className="flex items-center gap-3">
          <button aria-label="התראות" className="w-10 h-10 rounded-full bg-card border border-line flex items-center justify-center text-muted hover:text-ink transition-colors cursor-pointer">
            <Bell className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
            {(profile.name || '?')[0]}
          </div>
        </div>
      </div>

      {/* Hero Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="bg-gradient-to-br from-[#4A6FFF] to-[#7B95FF] rounded-2xl p-5 text-white relative overflow-hidden shadow-sm">
          <p className="text-sm font-medium opacity-80">💳 יתרה פנויה לחודש</p>
          <p dir="ltr" className="font-black text-3xl font-num mt-1">{fmtILS(safeToSpend)}</p>
          <div className="flex items-center gap-4 mt-4 text-sm opacity-90">
            <span>הכנסות ↑ <span dir="ltr" className="font-num font-bold">{fmtILS(monthIncome || net)}</span></span>
            <span>הוצאות ↓ <span dir="ltr" className="font-num font-bold">{fmtILS(monthExpense)}</span></span>
          </div>
          <div className="mt-3 h-2.5 bg-white/20 rounded-full overflow-hidden flex">
            <div className="h-full bg-income rounded-r-full transition-all duration-700" style={{ width: `${incomePct}%` }} />
            <div className="h-full bg-expense rounded-l-full transition-all duration-700" style={{ width: `${expensePct}%` }} />
          </div>
        </div>
      </motion.div>

      {/* Countdowns */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-muted">💰 משכורת</span>
          </div>
          <p className="text-sm font-extrabold text-ink">{daysToSalary === 0 ? 'נכנסת היום! 🎉' : `בעוד ${daysToSalary} ימים`}</p>
          <p className="text-xs text-muted mt-1">כל ה-{profile.salaryDay} בחודש</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-expense" />
            <span className="text-xs font-bold text-muted">💳 אשראי</span>
          </div>
          <p className="text-sm font-extrabold text-ink">{daysToCredit === 0 ? 'חיוב היום! ⚠️' : `בעוד ${daysToCredit} ימים`}</p>
          <p className="text-xs text-muted mt-1">צבור: <span dir="ltr" className="font-num">{fmtILS(monthExpense)}</span></p>
        </Card>
      </div>

      {/* Expense Categories */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <SectionTitle title="הוצאות לפי קטגוריה" />
        <div className="grid grid-cols-2 gap-3">
          {topCats.map(([key, amount]) => {
            const cat = budget.find(b => b.key === key);
            if (!cat || !cat.amount) return null;
            const catAmt = cat.amount as number;
            const pctVal = Math.min(100, (amount / catAmt) * 100);
            const barColor = pctVal > 85 ? '#FF647C' : pctVal > 65 ? '#F2C94C' : '#00C48C';
            return (
              <Card key={key}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="text-sm font-semibold text-ink truncate">{key}</span>
                </div>
                <p dir="ltr" className="font-black text-lg font-num text-ink">{fmtILS(amount as number)}</p>
                <ProgressBar value={amount as number} max={catAmt} color={barColor} heightClass="h-1.5" />
                <p className="text-xs text-muted mt-1">{Math.round(pctVal)}% מהתקציב</p>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
        <SectionTitle title="עסקאות אחרונות" action={
          <button onClick={() => onNavigateToTab('transactions')} className="text-xs text-primary font-bold hover:underline cursor-pointer">ראה הכל ›</button>
        } />
        <Card>
          {recentTxs.length === 0 ? (
            <p className="text-center text-muted text-sm py-8">אין עסקאות עדיין</p>
          ) : recentTxs.map(tx => {
            const isIncome = tx.amount > 0;
            return (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-line last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-xl">{tx.emoji}</div>
                  <div>
                    <p className="text-sm font-medium text-ink">{tx.description}</p>
                    <p className="text-xs text-muted">{fmtDate(tx.date)}</p>
                  </div>
                </div>
                <span dir="ltr" className={`font-semibold text-sm font-num ${isIncome ? 'text-income' : 'text-expense'}`}>
                  {isIncome ? '+' : ''}{fmtILS(tx.amount)}
                </span>
              </div>
            );
          })}
        </Card>
      </motion.div>

      {/* AI Insight */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <span className="text-sm font-bold text-ink">תובנת AI</span>
            </div>
            <button onClick={fetchAiInsight} disabled={aiLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-xl cursor-pointer hover:bg-primary/20 transition-colors disabled:opacity-50">
              {aiLoading ? <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>{aiInsight ? 'רענן' : 'קבל טיפ'}</span>
            </button>
          </div>
          {aiLoading && !aiInsight && <Skeleton className="h-10 w-full" />}
          {aiInsight && <p className="text-sm text-muted leading-relaxed">{aiInsight}</p>}
        </Card>
      </motion.div>

      {/* FAB */}
      <button aria-label="הוסף עסקה" onClick={() => setShowAddModal(true)} className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-5 w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center z-40 transition-transform active:scale-95 cursor-pointer">
        <Plus className="w-7 h-7" />
      </button>

      {showAddModal && <AddTransactionModal onClose={() => setShowAddModal(false)} onAdd={onAddTransaction} />}
    </div>
  );
};
