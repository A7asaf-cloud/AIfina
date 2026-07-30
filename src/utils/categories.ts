/**
 * FinanceIL - Categories
 * Transaction categories match budget categories exactly — no double mapping.
 */
import { CategoryRule, BudgetPlanItem, Transaction } from '../types';

export const CAT_RULES: CategoryRule[] = [
  {
    cat: 'הכנסה', color: '#10B981', emoji: '💰',
    kw: ['משכורת', 'שכר', 'הכנסה', 'income', 'salary', 'wage', 'bonus', 'בונוס',
         'החזר', 'זיכוי', 'credit', 'refund', 'העברה נכנסת', 'transfer in',
         'הפקדה', 'deposit received', 'פיצויים', 'מענק'],
  },
  {
    cat: 'מזון ושוק', color: '#22C55E', emoji: '🛒',
    kw: ['שופרסל', 'רמי לוי', 'ויקטורי', 'מגה', 'יינות ביתן', 'אושר עד', 'חצי חינם',
         'am:pm', 'אמפמ', 'fresh market', 'קשת טעמים', 'טיב טעם', 'rami levy', 'shufersal',
         'סופרמרקט', 'מכולת', 'grocery', 'supermarket', 'food store', 'minimarket',
         'וולט', 'wolt', 'מקדונלד', 'mcdonald', 'קפה', 'cafe', 'coffee', 'מסעדה',
         'פיצה', 'pizza', 'סושי', 'בורגר', 'תן ביס', '10bis', 'ארומה', 'גולדה',
         'לנדוור', 'domino', 'kfc', 'burger king', 'שווארמה', 'פלאפל', 'חומוס',
         'bar ', 'restaurant', 'גריל', 'starbucks', 'אוכל'],
  },
  {
    cat: 'דיור', color: '#64748B', emoji: '🏠',
    kw: ['שכר דירה', 'שכירות', 'rent', 'mortgage', 'משכנתה', 'משכנתא',
         'דמי שכירות', 'housing', 'apartment', 'דירה', 'ועד בית', 'house committee',
         'ארנונה', 'עיריית', 'עירייה', 'municipality', 'אגרה', 'היטל'],
  },
  {
    cat: 'תחבורה', color: '#3B82F6', emoji: '🚌',
    kw: ['paz', 'פז', 'sonol', 'סונול', 'דלק', 'fuel', 'yellow', 'דור אלון', 'טנגו',
         'orio', 'אוריו', 'petrol', 'gas station', 'תדלוק', 'delek', 'gulf',
         'car wash', 'שטיפת רכב', 'ביטוח רכב', 'רישוי', 'טסט', 'מוסך',
         'אגד', 'דן', 'רב-קו', 'ravkav', 'רכבת', 'israel railways',
         'גט', 'gett', 'yango', 'bolt', 'taxi', 'מונית', 'חניה', 'parking',
         'פנגו', 'pango', 'cello', 'אוטובוס', 'bus', 'uber', 'shuttle', 'airport'],
  },
  {
    cat: 'חשבונות', color: '#EAB308', emoji: '💡',
    kw: ['חברת החשמל', 'iec', 'חשמל', 'electricity', 'מים', 'water',
         'גז', 'gas', 'אמישראגז', 'סופרגז',
         'partner', 'פרטנר', 'cellcom', 'סלקום', 'פלאפון', 'pelephone',
         'bezeq', 'בזק', 'golan', 'גולן', '012', 'internet', 'אינטרנט',
         'hot mobile', 'hot ', 'הוט', 'yes ', 'יס ', 'cable',
         'maintenance', 'תחזוקה', 'עמידר'],
  },
  {
    cat: 'בריאות', color: '#14B8A6', emoji: '🏥',
    kw: ['מכבי', 'כללית', 'לאומית', 'מאוחדת', 'סופר-פארם', 'super pharm', 'superpharm',
         'תרופות', 'pharmacy', 'בית מרקחת', 'קופת חולים', 'מרפאה', 'clinic',
         'doctor', 'רופא', 'hospital', 'בית חולים', 'dental', 'שיניים',
         'optic', 'משקפיים', 'gym', 'כושר', 'sport', 'ספורט', 'fitness',
         'pilates', 'yoga', 'health', 'wellness', 'ביטוח', 'insurance',
         'הראל', 'מנורה', 'כלל ביטוח', 'מגדל ביטוח', 'איילון', 'פניקס', 'aig'],
  },
  {
    cat: 'בידור', color: '#EC4899', emoji: '🎬',
    kw: ['netflix', 'נטפליקס', 'spotify', 'ספוטיפיי', 'disney', 'apple tv',
         'youtube', 'steam', 'cinema', 'סינמה', 'קולנוע', 'hbo', 'paramount',
         'apple music', 'deezer', 'tidal', 'google play', 'app store',
         'gaming', 'playstation', 'xbox', 'nintendo', 'twitch',
         'yes planet', 'cinema city', 'כרטיס', 'theater', 'תיאטרון', 'concert', 'הופעה'],
  },
  {
    cat: 'קניות', color: '#F59E0B', emoji: '🛍️',
    kw: ['amazon', 'אמזון', 'aliexpress', 'ebay', 'זארה', 'zara', 'h&m',
         'קסטרו', 'castro', 'ksp', 'אייבורי', 'ivory', 'איקאה', 'ikea',
         'shein', 'שאין', 'טרמינל', 'terminal', 'factory 54', 'fox', 'פוקס',
         'renuar', 'רנואר', 'golf', 'גולף', 'adidas', 'nike', 'puma',
         'clothing', 'apparel', 'נעליים', 'בגדים', 'walmart', 'best buy',
         'electronics', 'אלקטרוניקה', 'קניון', 'mall'],
  },
  {
    cat: 'חיסכון', color: '#8B5CF6', emoji: '💎',
    kw: ['פיקדון', 'deposit', 'savings', 'חיסכון', 'קרן', 'פנסיה', 'pension',
         'השתלמות', 'השקעה', 'investment', 'גמל', 'ביטוח חיים'],
  },
];

export const DEF_CAT = { cat: 'שונות', color: '#9CA3AF', emoji: '📦' };

export const ALL_CATS = [
  ...CAT_RULES.map((r) => ({ cat: r.cat, color: r.color, emoji: r.emoji })),
  DEF_CAT,
];

export function categorize(desc: string): { cat: string; color: string; emoji: string } {
  if (!desc || typeof desc !== 'string') return { ...DEF_CAT };
  const low = desc.toLowerCase().trim();
  for (const r of CAT_RULES) {
    for (const kw of r.kw) {
      if (low.includes(kw.toLowerCase())) {
        return { cat: r.cat, color: r.color, emoji: r.emoji };
      }
    }
  }
  return { ...DEF_CAT };
}

export const DEFAULT_BUDGET_PLAN: BudgetPlanItem[] = [
  { key: 'דיור',      pct: 30, color: '#64748B', emoji: '🏠' },
  { key: 'מזון ושוק', pct: 15, color: '#22C55E', emoji: '🛒' },
  { key: 'תחבורה',   pct: 10, color: '#3B82F6', emoji: '🚌' },
  { key: 'חשבונות',  pct: 8,  color: '#EAB308', emoji: '💡' },
  { key: 'בריאות',   pct: 5,  color: '#14B8A6', emoji: '🏥' },
  { key: 'בידור',    pct: 7,  color: '#EC4899', emoji: '🎬' },
  { key: 'קניות',    pct: 5,  color: '#F59E0B', emoji: '🛍️' },
  { key: 'חיסכון',   pct: 10, color: '#8B5CF6', emoji: '💎' },
  { key: 'שונות',    pct: 10, color: '#9CA3AF', emoji: '📦' },
];

// Transaction category → budget category (now 1:1 since names match)
export const CAT_TO_BUDGET: Record<string, string> = {
  'הכנסה':    'הכנסה',
  'מזון ושוק': 'מזון ושוק',
  'דיור':     'דיור',
  'תחבורה':  'תחבורה',
  'חשבונות': 'חשבונות',
  'בריאות':  'בריאות',
  'בידור':   'בידור',
  'קניות':   'קניות',
  'חיסכון':  'חיסכון',
  'שונות':   'שונות',
};

export function calcBudget(netSalary: number, plan: BudgetPlanItem[]): BudgetPlanItem[] {
  const currentPlan = plan && plan.length ? plan : DEFAULT_BUDGET_PLAN;
  return currentPlan.map((b) => ({
    ...b,
    amount: Math.round((netSalary * b.pct) / 100),
  }));
}

export function spentPerBudget(txs: Transaction[], budget: BudgetPlanItem[]): Record<string, number> {
  const map: Record<string, number> = {};
  budget.forEach((b) => { map[b.key] = 0; });
  const now = new Date();
  txs
    .filter((t) => t.amount < 0)
    .forEach((t) => {
      const d = new Date(t.date);
      if (!isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        const bk = CAT_TO_BUDGET[t.cat] || 'שונות';
        if (map[bk] !== undefined) map[bk] += Math.abs(t.amount);
        else if (map['שונות'] !== undefined) map['שונות'] += Math.abs(t.amount);
      }
    });
  return map;
}
