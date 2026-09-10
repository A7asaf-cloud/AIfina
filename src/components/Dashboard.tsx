import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowLeft, ChevronDown, CalendarDays, Plus, Wallet, ShieldCheck, Sparkles, TrendingUp, Info, Check, CircleAlert, Pencil } from 'lucide-react';
import { BudgetPlanItem, StandingOrder, StockHolding, Transaction, UserProfile } from '../types';
import { calcBudget, CATEGORIES, CategoryKey } from '../utils/categories';
import { calculateCashflow, localDateKey, CashflowItem } from '../utils/cashflow';
import { fmtDate, fmtILS, monthLabelHe } from '../utils/formatters';
import { AddTransactionModal } from './AddTransactionModal';
import '../dashboard-v2.css';

interface DashboardProps {
  profile: UserProfile; transactions: Transaction[]; budgetPlan: BudgetPlanItem[];
  holdings: StockHolding[]; portfolioCash: number; standingOrders: StandingOrder[];
  onAddTransaction: (tx: Transaction) => void;
  onUpdateCategory: (txId: string | number, newCat: string) => void;
  onNavigateToTab: (tab: string) => void;
  onUpdateTransaction?: (tx: Transaction) => void;
  isDemo?: boolean;
}
const Money = ({ value, className = '' }: { value: number; className?: string }) => <span className={`v2-money ${className}`} dir="ltr">{fmtILS(value)}</span>;
const sourceLabel: Record<string, string> = { transaction: 'מתוכננת', 'standing-order': 'הוראת קבע', salary: 'הכנסה צפויה', rent: 'שכירות צפויה', credit: 'חיוב אשראי' };

export const Dashboard: React.FC<DashboardProps> = ({ profile, transactions, budgetPlan, standingOrders, onAddTransaction, onNavigateToTab, onUpdateTransaction, isDemo = false }) => {
  const [modal, setModal] = useState<'posted' | 'planned' | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showCalculation, setShowCalculation] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const now = new Date();
  const today = localDateKey(now);
  const month = today.slice(0, 7);
  const flow = useMemo(() => calculateCashflow(profile, transactions, standingOrders, now), [profile, transactions, standingOrders, today]);
  const budget = useMemo(() => calcBudget(profile.netSalary || 0, budgetPlan), [profile.netSalary, budgetPlan]);
  const actual = transactions.filter(tx => tx.date.slice(0, 7) === month && tx.date <= today && (!tx.status || tx.status === 'posted') && tx.kind !== 'transfer' && tx.kind !== 'credit-settlement');
  const categoryMap = new Map<string, number>();
  actual.filter(tx => tx.amount < 0).forEach(tx => categoryMap.set(tx.cat, (categoryMap.get(tx.cat) || 0) + Math.abs(tx.amount)));
  const categories = [...categoryMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const totalActualExpenses = flow.actualFixedExpenses + flow.actualVariableExpenses;
  const points = flow.dailyForecast.length ? flow.dailyForecast : [{ date: today, balance: flow.currentBalance, income: 0, expenses: 0 }];
  const activeIndex = Math.min(selectedPoint ?? points.length - 1, points.length - 1);
  const activePoint = points[activeIndex];
  const activeEvents = flow.upcoming.filter(item => item.date === activePoint.date);
  const chartMax = Math.max(1, ...points.map(point => point.balance)) * 1.12;
  const chartMin = Math.min(0, ...points.map(point => point.balance)) - Math.max(1, chartMax) * .06;
  const x = (index: number) => 42 + index / Math.max(1, points.length - 1) * 616;
  const y = (balance: number) => 170 - (balance - chartMin) / (chartMax - chartMin) * 150;
  const chartPath = points.map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point.balance)}`).join(' ');
  const chartArea = `${chartPath} L ${x(points.length - 1)} 180 L 42 180 Z`;
  const upcoming = showAllUpcoming ? flow.upcoming : flow.upcoming.slice(0, 4);
  const uncategorized = actual.filter(tx => tx.amount < 0 && tx.cat === 'שונות').length;
  const overspent = categories.find(([cat, amount]) => { const target = budget.find(item => item.key === cat)?.amount || 0; return target > 0 && amount > target; });
  const scrollToUpcoming = () => document.getElementById('v2-upcoming')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const editUpcoming = (item: CashflowItem) => {
    const existing = transactions.find(tx => tx.id === item.id);
    if (existing) { setEditingTransaction(existing); return; }
    const recurringId = item.source === 'salary' ? 'salary' : item.source === 'rent' ? 'rent'
      : standingOrders.find(order => item.id === `standing-${order.id}-${month}`)?.id;
    const category = CATEGORIES[item.cat as CategoryKey] || CATEGORIES['שונות'];
    setEditingTransaction({
      id: item.id, description: item.description, amount: item.amount,
      date: item.date, cat: item.cat, emoji: item.emoji, color: category.color,
      status: 'planned', expenseType: item.expenseType, paymentMethod: 'bank',
      recurringId, kind: item.source === 'credit' ? 'credit-settlement' : item.amount > 0 ? 'income' : 'expense',
      balanceIncluded: false, account: 'תכנון תזרים',
    });
  };
  const saveEditedTransaction = (tx: Transaction) => {
    if (transactions.some(existing => existing.id === tx.id)) onUpdateTransaction?.(tx);
    else onAddTransaction(tx);
  };

  return <div className="v2-dashboard" dir="rtl">
    <header className="v2-page-header">
      <div><div className="v2-eyebrow">מרחב אישי · {profile.name || 'הכסף שלך'}</div><h1>התזרים שלי<span className="v2-title-dot">.</span></h1><p>כל החודש מול העיניים. צעד אחד יותר ברור.</p></div>
      <div className="v2-header-actions"><span className="v2-month"><CalendarDays size={16} />{monthLabelHe(now.getFullYear(), now.getMonth())}</span><button className="v2-button" onClick={() => setModal('posted')}><Plus size={17} />הוספת תנועה</button></div>
    </header>
    {isDemo && <div className="v2-demo-notice"><span><Sparkles size={15} />סביבת הדגמה אינטראקטיבית</span><span>נתונים לדוגמה · אפשר להתנסות בהוספת תנועות</span></div>}
    <div className="v2-top-grid">
      <section className="v2-spend-card" aria-labelledby="spend-title">
        <div className="v2-spend-top"><span className="v2-pill"><span className="v2-status-dot" />{flow.safeToSpend > 0 ? 'יש מקום לנשום' : 'כדאי לשים לב'}</span><ShieldCheck size={25} strokeWidth={1.5} /></div>
        <h2 id="spend-title">פנוי להוצאה עד סוף החודש</h2><Money value={flow.safeToSpend} className="v2-hero-amount" />
        <p className="v2-spend-description">אחרי ההתחייבויות הידועות ורשת הביטחון</p>
        <div className="v2-spend-footer"><div><span className="v2-daily"><Money value={flow.dailyAllowance} /> <small>ליום, בממוצע</small></span><span className="v2-days">נשארו {flow.daysRemaining} ימים בחודש</span></div><button className="v2-explain-button" onClick={() => setShowCalculation(!showCalculation)} aria-expanded={showCalculation}>איך חישבנו?<ChevronDown size={16} className={showCalculation ? 'v2-rotated' : ''} /></button></div>
        {showCalculation && <div className="v2-calculation"><div><span>יתרה נוכחית</span><Money value={flow.currentBalance} /></div><div><span>התחייבויות שנותרו</span><Money value={-flow.remainingCommitted} /></div><div><span>שמירה להוצאות שוטפות</span><Money value={-flow.variableReserve} /></div><div><span>רשת ביטחון</span><Money value={-flow.buffer} /></div><p>החישוב נשען על המידע שהוזן. הכנסות עתידיות אינן כסף זמין היום; הוצאות חדשות עשויות לשנות את הסכום.</p></div>}
      </section>
      <section className="v2-balance-card v2-panel"><div className="v2-card-label"><span className="v2-icon-box"><Wallet size={20} /></span><span>המצב בחשבון</span></div><div className="v2-balance-value"><span>יתרה נוכחית</span><Money value={flow.currentBalance} /></div><div className="v2-balance-divider" /><div className="v2-projection"><div><span>צפי לסוף החודש</span><Money value={flow.projectedEndBalance} className={flow.projectedEndBalance < 0 ? 'v2-negative' : ''} /></div><span className="v2-projection-icon"><TrendingUp size={24} /></span></div><p className="v2-footnote"><Info size={13} />לפי היתרה שהוזנה והתנועות הידועות</p></section>
    </div>
    <section className="v2-metrics" aria-label="החודש במספרים">
      <button className="v2-metric" onClick={() => onNavigateToTab('transactions')}><span className="v2-metric-heading"><span className="v2-mini-icon green"><ArrowDownLeft size={17} /></span>הכנסות שהתקבלו</span><Money value={flow.actualIncome} /><span className="v2-metric-note">נכנסו החודש לחשבון</span></button>
      <button className="v2-metric" onClick={scrollToUpcoming}><span className="v2-metric-heading"><span className="v2-mini-icon blue"><CalendarDays size={17} /></span>הכנסות בדרך</span><Money value={flow.expectedIncome} /><span className="v2-metric-note">צפויות עד סוף החודש</span></button>
      <button className="v2-metric" onClick={() => onNavigateToTab('transactions')}><span className="v2-metric-heading"><span className="v2-mini-icon sand"><ArrowUpRight size={17} /></span>הוצאות קבועות</span><Money value={flow.actualFixedExpenses} /><span className="v2-metric-note">עוד <Money value={flow.expectedFixedExpenses} /> צפויים החודש</span></button>
      <button className="v2-metric" onClick={() => onNavigateToTab('budget')}><span className="v2-metric-heading"><span className="v2-mini-icon lilac"><ArrowUpRight size={17} /></span>הוצאות משתנות</span><Money value={flow.actualVariableExpenses} /><span className="v2-metric-note">עוד <Money value={flow.expectedVariableExpenses} /> מתוכננים</span></button>
    </section>
    <div className="v2-middle-grid">
      <section className="v2-panel v2-chart-card"><div className="v2-section-heading"><div><h2>המשך החודש, במבט קדימה</h2><p>היתרה הצפויה לפי התנועות שכבר ידועות</p></div><span className="v2-chart-legend"><i />תחזית</span></div>
        <div className="v2-chart-value"><Money value={activePoint.balance} /><span>{activePoint.date === today ? 'היום' : fmtDate(activePoint.date)}{activeEvents.length ? ` · ${activeEvents.map(item => item.description).join(', ')}` : ' · יתרה צפויה'}</span></div>
        <div className="v2-chart" dir="ltr"><svg viewBox="0 0 700 212" role="img" aria-label={`תחזית יתרה מהיום עד סוף החודש. יתרת סיום ${fmtILS(flow.projectedEndBalance)}. יתרה נמוכה ביותר ${fmtILS(flow.lowestProjectedBalance)} בתאריך ${fmtDate(flow.lowestBalanceDate)}`}><defs><linearGradient id="v2-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#79B19A" stopOpacity=".28" /><stop offset="100%" stopColor="#79B19A" stopOpacity=".015" /></linearGradient></defs>{[.25, .55, .85].map(ratio => <line key={ratio} x1="42" x2="658" y1={20 + ratio * 150} y2={20 + ratio * 150} stroke="#E7EBE6" strokeDasharray="3 5" />)}{chartMin < 0 && <line x1="42" x2="658" y1={y(0)} y2={y(0)} stroke="#D8DCD6" />}<path d={chartArea} fill="url(#v2-chart-fill)" /><path d={chartPath} fill="none" stroke="#2D7964" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />{points.map((point, index) => <g key={point.date}><title>{fmtDate(point.date)}: {fmtILS(point.balance)}</title>{(point.income > 0 || index === 0 || index === points.length - 1 || index === activeIndex) && <circle cx={x(index)} cy={y(point.balance)} r={index === activeIndex ? 6 : 4} fill={index === points.length - 1 ? '#D7F281' : '#FFF'} stroke="#2D7964" strokeWidth="2" />}<rect x={x(index) - 13} y="0" width="26" height="190" fill="transparent" onMouseEnter={() => setSelectedPoint(index)} onMouseLeave={() => setSelectedPoint(null)} onClick={() => setSelectedPoint(index)} /></g>)}{[0, Math.floor((points.length - 1) / 2), points.length - 1].filter((index, i, array) => array.indexOf(index) === i).map(index => <text key={index} x={x(index)} y="207" textAnchor="middle" fill="#77837C" fontSize="11">{index === 0 ? 'היום' : `${Number(points[index].date.slice(-2))}.${now.getMonth() + 1}`}</text>)}</svg></div>
        <input className="v2-chart-slider" type="range" min={0} max={points.length - 1} value={activeIndex} onChange={event => setSelectedPoint(Number(event.target.value))} aria-label="בחרו יום בתחזית" />
        <div className="v2-chart-bottom"><span><span className="v2-small-dot" />היתרה הנמוכה הצפויה</span><strong><Money value={flow.lowestProjectedBalance} /> <span>ב־{fmtDate(flow.lowestBalanceDate)}</span></strong></div>
      </section>
      <aside className="v2-insights"><div className="v2-insight-title"><Sparkles size={18} /><span>שווה תשומת לב</span></div><div className="v2-insight-main"><span className="v2-insight-art">{flow.lowestProjectedBalance < 0 ? <CircleAlert size={26} /> : <Check size={28} />}</span><h2>{flow.lowestProjectedBalance < 0 ? 'מזהים פער מראש' : flow.safeToSpend > 0 ? 'החודש בידיים שלך' : 'שומרים על מרווח נשימה'}</h2><p>{flow.lowestProjectedBalance < 0 ? `ב־${fmtDate(flow.lowestBalanceDate)} צפויה יתרה של ${fmtILS(flow.lowestProjectedBalance)}. כדאי לבדוק אילו הוצאות אפשר להזיז.` : flow.safeToSpend > 0 ? `קצב של כ־${fmtILS(flow.dailyAllowance)} ביום יעזור לשמור על הסכום הפנוי עד סוף החודש.` : 'היתרה הנוכחית כבר שמורה להתחייבויות ולרשת הביטחון. כדאי לעבור על התנועות הקרובות.'}</p></div><button className="v2-insight-link" onClick={() => onNavigateToTab(overspent ? 'budget' : uncategorized ? 'transactions' : 'budget')}><div><strong>{overspent ? `חריגה בתקציב ${overspent[0]}` : uncategorized ? `${uncategorized} תנועות מחכות לסיווג` : 'לתת לכל שקל כיוון'}</strong><p>{overspent ? 'אפשר לעדכן את התכנון להמשך החודש' : uncategorized ? 'סיווג קצר ייתן תמונה מדויקת יותר' : 'התקציב עוזר להפוך כוונה להרגל'}</p></div><ArrowLeft size={18} /></button></aside>
    </div>
    {flow.warnings.length > 0 && <details className="v2-data-warnings"><summary><Info size={15} />{flow.warnings.length} פרטים שכדאי להשלים לדיוק התחזית</summary><ul>{flow.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></details>}
    <div className="v2-bottom-grid">
      <section className="v2-panel" id="v2-upcoming"><div className="v2-section-heading"><div><h2>בקרוב בחשבון</h2><p>{flow.upcoming.length} תנועות צפויות עד סוף החודש</p></div><button className="v2-text-button" onClick={() => setModal('planned')}><Plus size={14} />תכנון תנועה</button></div><div className="v2-upcoming-list">{upcoming.length ? upcoming.map(item => <div className="v2-upcoming-row" key={String(item.id)}><span className={`v2-transaction-icon ${item.amount > 0 ? 'is-income' : ''}`}>{item.emoji}</span><div className="v2-transaction-description"><strong>{item.description}</strong><span>{fmtDate(item.date)} <i>·</i> {item.overdue ? 'ממתינה לאישור ביצוע' : sourceLabel[item.source]}</span></div><Money value={item.amount} className={item.amount > 0 ? 'v2-positive' : ''} />{onUpdateTransaction && <button className="v2-edit-transaction" aria-label={`עריכת ${item.description}`} onClick={() => editUpcoming(item)}><Pencil size={13} /></button>}</div>) : <div className="v2-empty"><CalendarDays size={28} /><strong>המשך החודש פנוי מתכנונים</strong><p>אפשר להוסיף הכנסות והוצאות צפויות כדי לחדד את התמונה.</p></div>}</div>{flow.upcoming.length > 4 && <button className="v2-all-button" onClick={() => setShowAllUpcoming(!showAllUpcoming)}>{showAllUpcoming ? 'הצגת פחות תנועות' : `לכל ${flow.upcoming.length} התנועות`}<ChevronDown size={15} className={showAllUpcoming ? 'v2-rotated' : ''} /></button>}</section>
      <section className="v2-panel"><div className="v2-section-heading"><div><h2>לאן הכסף הולך?</h2><p>הוצאות שבוצעו החודש לפי קטגוריה</p></div><button className="v2-text-button" onClick={() => onNavigateToTab('budget')}>לכל התקציב<ArrowLeft size={14} /></button></div><div className="v2-category-list">{categories.length ? categories.map(([cat, amount], index) => { const item = budget.find(entry => entry.key === cat); const cap = item?.amount || 0; const percent = cap ? amount / cap * 100 : amount / Math.max(1, totalActualExpenses) * 100; return <button className="v2-category" key={cat} onClick={() => onNavigateToTab('budget')}><div className="v2-category-heading"><span><i className={`v2-category-dot color-${index}`} />{cat}</span><Money value={amount} /></div><div className="v2-progress"><i className={`color-${index}`} style={{ width: `${Math.min(100, percent)}%` }} /></div><div className="v2-category-caption"><span>{cap ? amount > cap ? `חריגה של ${fmtILS(amount - cap)}` : `נשארו ${fmtILS(cap - amount)}` : 'ללא תקציב מוגדר'}</span><span>{cap ? `מתוך ${fmtILS(cap)}` : `${Math.round(percent)}% מההוצאות`}</span></div></button>; }) : <div className="v2-empty"><Wallet size={28} /><strong>כאן מתחילה התמונה שלך</strong><p>אחרי הוספת הוצאות יופיע כאן הפירוט לפי קטגוריות.</p></div>}</div></section>
    </div>
    <footer className="v2-dashboard-footer"><span className="v2-footer-brand">AIfina<span>✳</span></span><span>קצת יותר בהירות. קצת יותר שקט.</span><span>התחזית מבוססת על הנתונים שהוזנו</span></footer>
    {modal && <AddTransactionModal initialStatus={modal} onClose={() => setModal(null)} onAdd={onAddTransaction} />}
    {editingTransaction && onUpdateTransaction && <AddTransactionModal initialTransaction={editingTransaction} onClose={() => setEditingTransaction(null)} onAdd={saveEditedTransaction} />}
  </div>;
};
