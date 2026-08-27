import { Transaction } from '../types';
import { CATEGORIES, CategoryKey } from './categories';

export interface DemoBank {
  id: string;
  name: string;
  short: string;
  color: string;
  logo: string;
}

export const DEMO_BANKS: DemoBank[] = [
  { id: 'hapoalim', name: 'בנק הפועלים', short: 'פועלים', color: '#00843D', logo: '🏦' },
  { id: 'leumi', name: 'בנק לאומי', short: 'לאומי', color: '#00539B', logo: '🏦' },
  { id: 'discount', name: 'בנק דיסקונט', short: 'דיסקונט', color: '#00338D', logo: '🏦' },
  { id: 'mizrahi', name: 'בנק מזרחי טפחות', short: 'מזרחי', color: '#7A1FA2', logo: '🏦' },
  { id: 'max', name: 'מאקס (אשראי)', short: 'מאקס', color: '#FF1744', logo: '💳' },
  { id: 'cal', name: 'כאל (אשראי)', short: 'כאל', color: '#F7941E', logo: '💳' },
  { id: 'isracard', name: 'ישראכרט (אשראי)', short: 'ישראכרט', color: '#D32F2F', logo: '💳' },
  { id: 'mercantile', name: 'בנק מרכנתיל', short: 'מרכנתיל', color: '#006C6C', logo: '🏦' },
];

// ── Realistic demo transactions ─────────────────────────────────────────────

interface SimDef { desc: string; cat: CategoryKey; min: number; max: number; account?: string }

const EXPENSES: SimDef[] = [
  { desc: 'שופרסל דיל', cat: 'מזון ושוק', min: 90, max: 420, account: 'אשראי' },
  { desc: 'רמי לוי שיווק השקמה', cat: 'מזון ושוק', min: 120, max: 380, account: 'אשראי' },
  { desc: 'מקדונלדס', cat: 'מזון ושוק', min: 34, max: 90, account: 'אשראי' },
  { desc: 'וולט משלוחים', cat: 'מזון ושוק', min: 60, max: 160, account: 'אשראי' },
  { desc: 'ארומה', cat: 'מזון ושוק', min: 20, max: 65, account: 'אשראי' },
  { desc: 'חברת החשמל', cat: 'חשבונות', min: 280, max: 520, account: 'הוראת קבע' },
  { desc: 'גז טבעי - פזגז', cat: 'חשבונות', min: 90, max: 240, account: 'הוראת קבע' },
  { desc: 'מי עירייה', cat: 'חשבונות', min: 70, max: 180, account: 'הוראת קבע' },
  { desc: 'סלקום - תקשורת', cat: 'חשבונות', min: 90, max: 180, account: 'הוראת קבע' },
  { desc: 'פרטנר תקשורת', cat: 'חשבונות', min: 80, max: 160, account: 'הוראת קבע' },
  { desc: 'ביטוח לאומי - ביטוח', cat: 'חשבונות', min: 120, max: 300, account: 'הוראת קבע' },
  { desc: 'בזק - סלקום', cat: 'חשבונות', min: 60, max: 140, account: 'הוראת קבע' },
  { desc: 'דלק בע"מ - תחנת דלק', cat: 'תחבורה', min: 180, max: 340, account: 'אשראי' },
  { desc: 'דנשר - דרך נשרים', cat: 'תחבורה', min: 150, max: 280, account: 'אשראי' },
  { desc: 'תחבורה ציבורית - רב קו', cat: 'תחבורה', min: 60, max: 180, account: 'אשראי' },
  { desc: 'חניה עירונית', cat: 'תחבורה', min: 15, max: 70, account: 'אשראי' },
  { desc: 'סופר-פארם', cat: 'בריאות', min: 45, max: 160, account: 'אשראי' },
  { desc: 'בית מרקחת', cat: 'בריאות', min: 30, max: 120, account: 'אשראי' },
  { desc: 'קופת חולים - אסם', cat: 'בריאות', min: 40, max: 180, account: 'אשראי' },
  { desc: 'נטפליקס', cat: 'בידור', min: 45, max: 65, account: 'אשראי' },
  { desc: 'סינמה סיטי', cat: 'בידור', min: 65, max: 140, account: 'אשראי' },
  { desc: 'ספריית הקולנוע הביתית - איטונס', cat: 'בידור', min: 20, max: 90, account: 'אשראי' },
  { desc: 'Zara', cat: 'קניות', min: 120, max: 500, account: 'אשראי' },
  { desc: 'המשביר לצרכן', cat: 'קניות', min: 90, max: 300, account: 'אשראי' },
  { desc: 'אמזון', cat: 'קניות', min: 80, max: 480, account: 'אשראי' },
  { desc: 'מוביל - ארניב', cat: 'שונות', min: 50, max: 200, account: 'אשראי' },
  { desc: 'מרקחת וטרינרית', cat: 'שונות', min: 60, max: 250, account: 'אשראי' },
];

const rand = (min: number, max: number) => Math.round((min + Math.random() * (max - min)) * 100) / 100;

// Deterministic-ish pseudo-random based on day seed so re-runs vary a bit
function seededAmount(def: SimDef, seed: number): number {
  // mix seed into random for slight variation per generation
  const s = (seed * 9301 + 49297) % 233280;
  const r = s / 233280;
  return Math.round((def.min + r * (def.max - def.min)) * 100) / 100;
}

export function generateDemoTransactions(bank: DemoBank, days: number = 60): Transaction[] {
  const txs: Transaction[] = [];
  const today = new Date();
  let id = 1000 + (bank.id.length * 137);

  // 2-3 salary credits over the period
  const salaryNet = 13200;
  for (let i = 0; i < Math.max(1, Math.floor(days / 28)); i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (i * 30 + 2));
    if (d.getTime() > today.getTime()) continue;
    const cat = CATEGORIES['הכנסה'];
    txs.push({
      id: id++,
      description: 'משכורת — העברה נכנסת',
      amount: salaryNet,
      date: d.toISOString().split('T')[0],
      cat: 'הכנסה', color: cat.color, emoji: cat.emoji,
      account: bank.short,
      auto: false,
    });
  }

  // Distribute expenses over the period
  const dayCount = Math.floor(days);
  const perDay = Math.floor(Math.random() * 3) + 1; // 1-3 tx/day
  const start = new Date(today);
  start.setDate(start.getDate() - dayCount);

  for (let dOff = 0; dOff < dayCount; dOff++) {
    const day = new Date(start);
    day.setDate(start.getDate() + dOff);
    if (day.getTime() > today.getTime()) break;
    const n = Math.floor(Math.random() * perDay) + (dOff === dayCount - 1 ? 0 : 0);
    for (let i = 0; i < n; i++) {
      const def = EXPENSES[Math.floor(Math.random() * EXPENSES.length)];
      const meta = CATEGORIES[def.cat];
      const amount = -seededAmount(def, dOff * 31 + i);
      // skip weekends a majority of the time (banks don't post weekend tx usually)
      const dow = day.getDay();
      if ((dow === 5 || dow === 6) && Math.random() > 0.3) continue;
      txs.push({
        id: id++,
        description: def.desc,
        amount,
        date: day.toISOString().split('T')[0],
        cat: def.cat, color: meta.color, emoji: meta.emoji,
        account: def.account || bank.short,
      });
    }
  }

  // Insurance / deductions
  txs.push({
    id: id++, description: 'ביטוח בריאות', amount: -210,
    date: start.toISOString().split('T')[0],
    cat: 'בריאות', color: CATEGORIES['בריאות'].color, emoji: CATEGORIES['בריאות'].emoji,
    account: 'הוראת קבע',
  });

  return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function demoBalance(bank: DemoBank): number {
  const base: Record<string, number> = {
    hapoalim: 24500, leumi: 31800, discount: 15400, mizrahi: 42000,
    max: -3200, cal: -1800, isracard: -4600, mercantile: 9800,
  };
  return base[bank.id] ?? 12000;
}

export interface DemoSummary {
  income: number;
  expense: number;
  avgDaily: number;
  topCategory: { cat: string; amount: number };
}

export function summarize(txs: Transaction[]): DemoSummary {
  let income = 0, expense = 0;
  const byCat: Record<string, number> = {};
  for (const t of txs) {
    if (t.amount > 0) income += t.amount; else expense += -t.amount;
    byCat[t.cat] = (byCat[t.cat] || 0) + -Math.min(0, t.amount);
  }
  const topCategory = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0] || { cat: 'שונות', amount: 0 };
  return { income, expense, avgDaily: Math.round(expense / 30), topCategory: { cat: topCategory[0], amount: topCategory[1] } };
}
