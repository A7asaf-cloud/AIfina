import { StandingOrder, Transaction, UserProfile } from '../types';

export interface CashflowItem {
  id: string | number;
  description: string;
  amount: number;
  date: string;
  cat: string;
  emoji: string;
  source: 'transaction' | 'standing-order' | 'salary' | 'rent' | 'credit';
  status: 'planned' | 'pending';
  overdue: boolean;
  expenseType?: 'fixed' | 'variable';
}
export interface CashflowDay { date: string; balance: number; income: number; expenses: number }
export interface CashflowSummary {
  currentBalance: number;
  actualIncome: number;
  expectedIncome: number;
  actualFixedExpenses: number;
  actualVariableExpenses: number;
  expectedFixedExpenses: number;
  expectedVariableExpenses: number;
  projectedEndBalance: number;
  safeToSpend: number;
  daysRemaining: number;
  upcoming: CashflowItem[];
  overdue: CashflowItem[];
  dailyForecast: CashflowDay[];
  lowestProjectedBalance: number;
  lowestBalanceDate: string;
  buffer: number;
  variableReserve: number;
  remainingCommitted: number;
  dailyAllowance: number;
  warnings: string[];
}

/** Calendar dates stay in local time: Israel's local midnight is yesterday in UTC. */
export const localDateKey = (date: Date): string =>
  [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
const money = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const validDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  return localDateKey(new Date(y, m - 1, d, 12)) === s;
};
const fixed = (t: Transaction) => t.expenseType ? t.expenseType === 'fixed'
  : Boolean(t.recurringId || t.auto || t.account?.startsWith('הוראת קבע'));
const salaryLike = (description: string) => /משכורת|שכר חודשי|salary/i.test(description);
const rentLike = (description: string) => /שכירות|שכר דירה|rent/i.test(description);

/** Reported balance is a snapshot. Never subtract history twice or silently post a plan. */
export function calculateCashflow(
  profile: UserProfile, transactions: Transaction[], standingOrders: StandingOrder[], now = new Date(),
): CashflowSummary {
  const today = localDateKey(now);
  const month = today.slice(0, 7);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dateForDay = (d: number) => month + '-' + String(Math.min(lastDay, Math.max(1, Math.trunc(d || 1)))).padStart(2, '0');
  const monthEnd = dateForDay(lastDay);
  const daysRemaining = lastDay - now.getDate() + 1;
  const warnings: string[] = [];
  const valid = transactions.filter(t => {
    const ok = validDate(t.date) && Number.isFinite(t.amount) && (!t.cashflowDate || validDate(t.cashflowDate));
    if (!ok) warnings.push('עסקה עם תאריך או סכום לא תקין לא נכללה בחישוב.');
    return ok;
  });
  const active = valid.filter(t => t.status !== 'cancelled' && t.kind !== 'transfer');
  const posted = (t: Transaction) => t.status ? t.status === 'posted' : t.date <= today;
  const inMonth = (date: string) => date.slice(0, 7) === month;
  const actual = active.filter(t => inMonth(t.date) && t.date <= today && posted(t) && t.kind !== 'credit-settlement');
  const sumActual = (predicate: (t: Transaction) => boolean) => money(actual.filter(predicate).reduce((s, t) => s + t.amount, 0));
  const actualIncome = sumActual(t => t.amount > 0);
  const actualFixedExpenses = Math.abs(sumActual(t => t.amount < 0 && fixed(t)));
  const actualVariableExpenses = Math.abs(sumActual(t => t.amount < 0 && !fixed(t)));
  const upcoming: CashflowItem[] = [];
  const settlements = new Set(active.filter(t => t.kind === 'credit-settlement').map(t => t.settlementId || String(t.id)));
  let unknownCredit = false;
  for (const t of active) {
    const date = t.cashflowDate || t.date;
    if (t.paymentMethod === 'credit' && t.kind !== 'credit-settlement') {
      if (t.settlementId && settlements.has(t.settlementId)) continue;
      if (!t.cashflowDate) { unknownCredit = true; continue; }
    }
    const cardAwaitingSettlement = t.paymentMethod === 'credit' && Boolean(t.cashflowDate) && date > today;
    if (posted(t) && !cardAwaitingSettlement) continue;
    if (date > monthEnd) continue;
    upcoming.push({ id: t.id, description: t.description, amount: money(t.amount), date, cat: t.cat, emoji: t.emoji,
      source: 'transaction', status: t.status === 'pending' ? 'pending' : 'planned', overdue: date < today,
      expenseType: fixed(t) || t.kind === 'credit-settlement' ? 'fixed' : 'variable' });
  }
  // A cancelled occurrence also suppresses the generated plan for this month.
  const occurrenceExists = (id: string | number) => valid.some(t => inMonth(t.date) &&
    (String(t.recurringId) === String(id) || t.account === 'הוראת קבע:' + id));
  for (const order of standingOrders) {
    if (!order.isActive || !Number.isFinite(order.amount) || occurrenceExists(order.id)) continue;
    const date = dateForDay(order.dayOfMonth);
    upcoming.push({ id: 'standing-' + order.id + '-' + month, description: order.description, amount: money(order.amount),
      date, cat: order.cat, emoji: order.emoji, source: 'standing-order', status: 'planned', overdue: date < today, expenseType: 'fixed' });
  }
  const salaryExists = valid.some(t => inMonth(t.date) && t.amount > 0 && (t.recurringId === 'salary' || salaryLike(t.description)));
  if (!salaryExists && !standingOrders.some(o => o.isActive && o.amount > 0 && salaryLike(o.description)) && profile.netSalary > 0) {
    const date = dateForDay(profile.salaryDay);
    upcoming.push({ id: 'salary-' + month, description: 'משכורת צפויה', amount: money(profile.netSalary), date,
      cat: 'הכנסה', emoji: '💰', source: 'salary', status: 'planned', overdue: date < today });
  }
  const rentExists = valid.some(t => inMonth(t.date) && t.amount < 0 && (t.recurringId === 'rent' || rentLike(t.description)));
  if (profile.rent > 0 && !rentExists && !standingOrders.some(o => o.isActive && rentLike(o.description))) {
    const date = dateForDay(profile.rentDay);
    upcoming.push({ id: 'rent-' + month, description: 'שכר דירה צפוי', amount: -money(profile.rent), date,
      cat: 'דיור', emoji: '🏠', source: 'rent', status: 'planned', overdue: date < today, expenseType: 'fixed' });
  }
  const creditDebt = Math.max(0, money(profile.creditDebt));
  const creditDate = profile.creditDebtDueDate && validDate(profile.creditDebtDueDate) ? profile.creditDebtDueDate : dateForDay(profile.creditDay);
  const creditCovered = active.some(t => t.kind === 'credit-settlement' && (t.cashflowDate || t.date) === creditDate && t.amount < 0);
  let extraCreditReserve = 0;
  if (creditDebt > 0 && !creditCovered) {
    const date = creditDate;
    // The entered card total is an aggregate, not an additional bill on top of
    // purchases scheduled for the same settlement date. Reserve its remainder.
    const knownPurchases = upcoming.filter(i => i.date === date && active.some(t => t.id === i.id && t.paymentMethod === 'credit' && t.kind !== 'credit-settlement'))
      .reduce((s, i) => s - Math.min(0, i.amount), 0);
    const remainingCreditDebt = Math.max(0, money(creditDebt - knownPurchases));
    if (date <= monthEnd && remainingCreditDebt > 0) upcoming.push({ id: 'credit-' + date, description: 'יתרת חיוב אשראי שהוזן', amount: -remainingCreditDebt, date,
      cat: 'אשראי', emoji: '💳', source: 'credit', status: 'planned', overdue: date < today, expenseType: 'fixed' });
    else if (date > monthEnd) extraCreditReserve = creditDebt;
    warnings.push('חוב האשראי מבוסס על הסכום שהוזן; יש לוודא אילו רכישות כלולות בו.');
    if (!profile.creditDebtDueDate && date < today) warnings.push('מועד חיוב האשראי עבר. החוב נשמר בצפי עד לאישור ששולם.');
  }
  if (unknownCredit) warnings.push('רכישות אשראי ללא מועד חיוב כלולות בהוצאות אך לא כתשלומי בנק נפרדים. יש לעדכן את חיוב האשראי.');
  upcoming.sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));
  const expectedIncome = money(upcoming.reduce((s, i) => s + Math.max(0, i.amount), 0));
  const expectedFixedExpenses = money(upcoming.filter(i => i.amount < 0 && i.expenseType === 'fixed').reduce((s, i) => s - i.amount, 0));
  const expectedVariableExpenses = money(upcoming.filter(i => i.amount < 0 && i.expenseType !== 'fixed').reduce((s, i) => s - i.amount, 0));
  const remainingCommitted = money(expectedFixedExpenses + expectedVariableExpenses + extraCreditReserve);
  const buffer = Math.max(0, money(profile.safetyBuffer ?? (profile.netSalary || 0) * 0.05));
  // A posted card purchase may appear in both category history and future bank
  // cash flow. It consumes the variable budget only once.
  const alreadyBudgetedCardExpenses = money(upcoming.filter(i => i.expenseType !== 'fixed' && i.amount < 0 &&
    actual.some(t => t.id === i.id && t.paymentMethod === 'credit')).reduce((s, i) => s - i.amount, 0));
  const variableReserve = Math.max(0, money((profile.monthlyVariableBudget || 0) - actualVariableExpenses - expectedVariableExpenses + alreadyBudgetedCardExpenses));
  if (!(profile.monthlyVariableBudget! > 0)) warnings.push('לא הוגדר תקציב להוצאות משתנות שנותרו. הסכום הפנוי מבוסס על התחייבויות ידועות בלבד.');
  if (!profile.balanceAsOf) warnings.push('היתרה מבוססת על הסכום שהוזן; מועד העדכון לא צוין.');
  else if (profile.balanceAsOf.slice(0, 10) < today) warnings.push('היתרה עודכנה ב־' + profile.balanceAsOf.slice(0, 10) + '. עדכון יתרה ישפר את התחזית.');
  const overdue = upcoming.filter(i => i.overdue);
  if (overdue.length) warnings.push('יש תנועות שמועדן עבר וטרם אושרו. התחזית מניחה שיחולו היום.');
  const unreflectedPosted = active.filter(t => {
    if (!posted(t) || t.date > today || t.balanceIncluded !== false || (t.cashflowDate && t.cashflowDate > today)) return false;
    if (t.paymentMethod !== 'credit' || t.kind === 'credit-settlement') return true;
    // Card purchase posting alone is not a bank debit. A known cash date may
    // update the balance, except when its linked settlement represents it.
    return Boolean(t.cashflowDate) && !(t.settlementId && settlements.has(t.settlementId));
  });
  const currentBalance = money(profile.bankBalance + unreflectedPosted.reduce((s, t) => s + t.amount, 0));
  let balance = currentBalance;
  let lowestProjectedBalance = currentBalance;
  let lowestBalanceDate = today;
  let allocatedReserve = 0;
  const dailyForecast: CashflowDay[] = [];
  for (let day = now.getDate(); day <= lastDay; day++) {
    const date = dateForDay(day);
    const items = upcoming.filter(i => (i.date < today ? today : i.date) === date);
    const income = money(items.reduce((s, i) => s + Math.max(0, i.amount), 0));
    const dailyReserve = money(money(variableReserve * (day - now.getDate() + 1) / daysRemaining) - allocatedReserve);
    allocatedReserve = money(allocatedReserve + dailyReserve);
    const expenses = money(items.reduce((s, i) => s - Math.min(0, i.amount), 0) + dailyReserve);
    balance = money(balance + income - expenses);
    dailyForecast.push({ date, balance, income, expenses });
    if (balance < lowestProjectedBalance) { lowestProjectedBalance = balance; lowestBalanceDate = date; }
  }
  // The conservative spending path excludes all unconfirmed future income.
  const safeToSpend = Math.max(0, money(currentBalance - remainingCommitted - variableReserve - buffer));
  return { currentBalance, actualIncome, expectedIncome, actualFixedExpenses, actualVariableExpenses, expectedFixedExpenses,
    expectedVariableExpenses, projectedEndBalance: balance, safeToSpend, daysRemaining, upcoming, overdue, dailyForecast,
    lowestProjectedBalance, lowestBalanceDate, buffer, variableReserve, remainingCommitted,
    dailyAllowance: Math.floor(safeToSpend / daysRemaining), warnings: [...new Set(warnings)] };
}
