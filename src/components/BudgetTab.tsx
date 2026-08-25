import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { BudgetPlanItem, UserProfile, Transaction } from '../types';
import { calcBudget, spentPerBudget, DEFAULT_BUDGET_PLAN, CATEGORIES } from '../utils/categories';
import { fmtILS, fmtPercent } from '../utils/formatters';
import { Card, SectionTitle, Button, ProgressBar, showToastError, showToast } from './ui';
import { ModalShell } from './ModalShell';
import { Edit2 } from 'lucide-react';

interface BudgetTabProps {
  profile: UserProfile;
  transactions: Transaction[];
  budgetPlan: BudgetPlanItem[];
  onUpdateBudget: (plan: BudgetPlanItem[]) => void;
}

export const BudgetTab: React.FC<BudgetTabProps> = ({ profile, transactions, budgetPlan, onUpdateBudget }) => {
  const [editing, setEditing] = useState(false);
  const [tempPlan, setTempPlan] = useState<BudgetPlanItem[]>([]);

  const net = profile.netSalary || 0;
  const plan = budgetPlan.length ? budgetPlan : DEFAULT_BUDGET_PLAN;
  const budget = useMemo(() => calcBudget(net, plan), [net, plan]);
  const spent = useMemo(() => spentPerBudget(transactions, budget), [transactions, budget]);

  const totalBudget = budget.reduce<number>((s, b) => s + (b.amount || 0), 0);
  const totalSpent = (Object.values(spent) as number[]).reduce<number>((s, v) => s + v, 0);
  const remaining = totalBudget - totalSpent;

  // Donut chart calculations
  const donutRadius = 75;
  const donutStroke = 20;
  const circumference = 2 * Math.PI * donutRadius;
  let cumulativeOffset = 0;

  const openEdit = () => { setTempPlan(budget.map(b => ({ ...b }))); setEditing(true); };
  const saveEdit = () => {
    const total = tempPlan.reduce((s, p) => s + p.pct, 0);
    if (total !== 100) { showToastError('החלוקה חייבת להיות 100%'); return; }
    onUpdateBudget(tempPlan); setEditing(false); showToast('התקציב עודכן ✓', 'success');
  };

  return (
    <div className="space-y-5 pb-4 text-right animate-fade-in">
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-ink">תקציב חודשי</h1>
          <p dir="ltr" className="text-sm text-muted font-num">{fmtILS(net)} לחלוקה</p>
        </div>
        <Button variant="outline" onClick={openEdit} className="h-10 px-3 text-xs"><Edit2 className="w-4 h-4" />ערוך</Button>
      </div>

      {/* Donut Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="flex flex-col items-center py-6">
          <div className="relative" style={{ width: 180, height: 180 }}>
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
              <circle cx="100" cy="100" r={donutRadius} fill="none" stroke="#EDF0F7" strokeWidth={donutStroke} />
              {budget.filter(b => (b.amount || 0) > 0).map(b => {
                const pct = totalBudget > 0 ? ((b.amount || 0) / totalBudget) : 0;
                const dash = circumference * pct;
                const offset = circumference - cumulativeOffset;
                cumulativeOffset += dash;
                return <circle key={b.key} cx="100" cy="100" r={donutRadius} fill="none" stroke={b.color} strokeWidth={donutStroke} strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={offset} strokeLinecap="butt" />;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {remaining >= 0 ? (
                <><p dir="ltr" className="font-black text-xl font-num text-income">{fmtILS(remaining)}</p><p className="text-xs text-muted">נשאר</p></>
              ) : (
                <><p dir="ltr" className="font-black text-xl font-num text-expense">{fmtILS(Math.abs(remaining))}</p><p className="text-xs text-muted">חריגה</p></>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Category List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <SectionTitle title="חלוקת קטגוריות" />
        <Card className="!p-0 overflow-hidden">
          {budget.map(b => {
            const currentSpent = spent[b.key] || 0;
            const pctVal = (b.amount || 0) > 0 ? Math.min(100, (currentSpent / (b.amount || 1)) * 100) : 0;
            const barColor = pctVal > 85 ? '#FF647C' : pctVal > 65 ? '#F2C94C' : '#00C48C';
            return (
              <div key={b.key} className="px-4 py-3 border-b border-line last:border-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{b.emoji}</span>
                    <span className="text-sm font-semibold text-ink">{b.key}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span dir="ltr" className="text-xs font-num text-muted">{fmtILS(currentSpent)} / {fmtILS(b.amount)}</span>
                    <span className={`text-xs font-bold ${pctVal > 85 ? 'text-expense' : 'text-muted'}`}>{Math.round(pctVal)}%</span>
                  </div>
                </div>
                <ProgressBar value={currentSpent} max={b.amount || 1} color={barColor} />
              </div>
            );
          })}
        </Card>
      </motion.div>

      {/* Edit Modal */}
      {editing && (
        <ModalShell onClose={() => setEditing(false)} ariaLabel="עריכת תקציב" panelClassName="space-y-4">
          <h3 className="text-lg font-bold text-ink">עריכת תקציב</h3>
          <div className={`text-center text-sm font-bold px-3 py-2 rounded-xl ${tempPlan.reduce((s, p) => s + p.pct, 0) === 100 ? 'bg-[#00C48C]/10 text-income' : 'bg-[#FF647C]/10 text-expense'}`}>
            סה"כ: {tempPlan.reduce((s, p) => s + p.pct, 0)}% {tempPlan.reduce((s, p) => s + p.pct, 0) === 100 ? '✓' : '(חייב 100%)'}
          </div>
          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {tempPlan.map(item => {
              const previewAmount = Math.round((net * item.pct) / 100);
              return (
                <div key={item.key}>
                  <div className="flex justify-between items-center text-sm font-semibold mb-1">
                    <span className="text-ink">{item.emoji} {item.key}</span>
                    <span dir="ltr" className="text-primary font-num">{item.pct}% — {fmtILS(previewAmount)}</span>
                  </div>
                  <input type="range" min="0" max="50" value={item.pct} onChange={e => setTempPlan(tempPlan.map(it => it.key === item.key ? { ...it, pct: parseInt(e.target.value, 10) } : it))} className="w-full accent-primary" />
                </div>
              );
            })}
          </div>
          <Button fullWidth onClick={saveEdit} disabled={tempPlan.reduce((s, p) => s + p.pct, 0) !== 100}>שמור תקציב ✓</Button>
        </ModalShell>
      )}
    </div>
  );
};
