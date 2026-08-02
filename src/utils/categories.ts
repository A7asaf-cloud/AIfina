/**
 * FinanceIL - Transaction Category Mapping
 * Hardcoded keyword matching. No AI required.
 * Categories match budget plan keys exactly.
 */
import { CategoryRule, BudgetPlanItem, Transaction } from '../types';

// ─── Category definitions ────────────────────────────────────────────────────

export const CATEGORIES = {
  הכנסה:    { color: '#10B981', emoji: '💰' },
  'מזון ושוק': { color: '#22C55E', emoji: '🛒' },
  דיור:     { color: '#64748B', emoji: '🏠' },
  תחבורה:  { color: '#3B82F6', emoji: '🚌' },
  חשבונות: { color: '#EAB308', emoji: '💡' },
  בריאות:  { color: '#14B8A6', emoji: '🏥' },
  בידור:   { color: '#EC4899', emoji: '🎬' },
  קניות:   { color: '#F59E0B', emoji: '🛍️' },
  חיסכון:  { color: '#8B5CF6', emoji: '💎' },
  שונות:   { color: '#9CA3AF', emoji: '📦' },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

// ─── Keyword → Category mapping ──────────────────────────────────────────────
// Each entry: [keywords[], category]
// Order matters — first match wins.

const RULES: [string[], CategoryKey][] = [
  // ── הכנסה ────────────────────────────────────────────────────────────────
  [[
    'משכורת', 'salary', 'wage', 'income', 'הכנסה',
    'bonus', 'בונוס', 'החזר', 'refund', 'זיכוי', 'credit',
    'העברה נכנסת', 'transfer in', 'הפקדה נכנסת', 'deposit received',
    'פיצויים', 'מענק', 'דמי הבראה', 'דמי חופשה',
  ], 'הכנסה'],

  // ── מזון ושוק ─────────────────────────────────────────────────────────────
  [[
    'שופרסל', 'shufersal', 'רמי לוי', 'rami levy', 'ויקטורי', 'victory',
    'מגה', 'mega', 'יינות ביתן', 'אושר עד', 'חצי חינם', 'am:pm', 'אמפמ',
    'טיב טעם', 'fresh market', 'קשת טעמים', 'סופרמרקט', 'supermarket',
    'מכולת', 'grocery', 'food store', 'minimarket', 'ספייסר', 'spiser',
    'שוק', 'market', 'aldi', 'carrefour',
    // מסעדות וקפה — חלק ממזון
    'וולט', 'wolt', 'מקדונלד', 'mcdonald', 'קפה', 'cafe', 'coffee',
    'מסעדה', 'restaurant', 'פיצה', 'pizza', 'סושי', 'sushi', 'בורגר', 'burger',
    'תן ביס', '10bis', 'ארומה', 'aroma', 'גולדה', 'לנדוור', 'landwer',
    'domino', 'kfc', 'שווארמה', 'shawarma', 'פלאפל', 'falafel',
    'חומוס', 'hummus', 'starbucks', 'גריל', 'grill', 'אוכל', 'food',
    'delivery', 'משלוח', 'catering', 'bar ', 'pub', 'יפני', 'chinese',
  ], 'מזון ושוק'],

  // ── דיור ─────────────────────────────────────────────────────────────────
  [[
    'שכר דירה', 'שכירות', 'שכר', 'rent', 'mortgage', 'משכנתה', 'משכנתא',
    'דמי שכירות', 'housing', 'דירה', 'apartment', 'ועד בית', 'house committee',
    'ארנונה', 'arnona', 'עיריית', 'עירייה', 'municipality',
    'אגרה', 'היטל', 'property tax', 'ביטוח דירה', 'home insurance',
  ], 'דיור'],

  // ── תחבורה ───────────────────────────────────────────────────────────────
  [[
    'paz', 'פז', 'sonol', 'סונול', 'דלק', 'fuel', 'yellow', 'דור אלון',
    'טנגו', 'tango', 'orio', 'אוריו', 'gil', 'petrol', 'gasoline',
    'gas station', 'תדלוק', 'delek', 'gulf', 'ten gas', 'pi glilot',
    'car wash', 'שטיפת רכב', 'ביטוח רכב', 'car insurance', 'רישוי', 'vehicle tax',
    'טסט', 'test', 'מוסך', 'garage', 'mechanic', 'spare parts',
    'אגד', 'egged', 'דן', 'dan ', 'רב-קו', 'ravkav', 'rav kav',
    'רכבת', 'train', 'israel railways', 'גט', 'gett', 'yango', 'bolt',
    'taxi', 'מונית', 'cab', 'חניה', 'parking', 'פנגו', 'pango',
    'cello', 'אוטובוס', 'bus', 'uber', 'lyft', 'shuttle',
    'airport transfer', 'נמל תעופה', 'scooter', 'קורקינט', 'bird',
  ], 'תחבורה'],

  // ── חשבונות ──────────────────────────────────────────────────────────────
  [[
    'חברת החשמל', 'iec', 'חשמל', 'electricity', 'electric',
    'מים', 'water', 'גז', 'gas', 'אמישראגז', 'supergas', 'סופרגז',
    'partner', 'פרטנר', 'cellcom', 'סלקום', 'פלאפון', 'pelephone',
    'bezeq', 'בזק', 'golan', 'גולן', '012', 'internet', 'אינטרנט',
    'hot ', 'הוט', 'yes ', 'יס ', 'cable', 'telecom', 'communication',
    '013', '017', '019', 'xfone', 'mobile', 'סלולר',
    'ועד בניין', 'maintenance fee', 'עמידר', 'אחזקה',
  ], 'חשבונות'],

  // ── בריאות ───────────────────────────────────────────────────────────────
  [[
    'מכבי', 'maccabi', 'כללית', 'clalit', 'לאומית', 'leumit',
    'מאוחדת', 'meuhedet', 'קופת חולים', 'health fund',
    'סופר-פארם', 'super pharm', 'superpharm', 'super-pharm',
    'תרופות', 'pharmacy', 'בית מרקחת', 'drug store', 'apteka',
    'מרפאה', 'clinic', 'doctor', 'רופא', 'hospital', 'בית חולים',
    'dental', 'שיניים', 'dentist', 'optic', 'משקפיים', 'optician',
    'gym', 'כושר', 'fitness', 'pilates', 'yoga', 'sport club',
    'health', 'wellness', 'ביטוח בריאות', 'health insurance',
    'ביטוח', 'insurance', 'הראל', 'מנורה', 'כלל ביטוח',
    'מגדל ביטוח', 'איילון', 'פניקס', 'aig', 'הפניקס', 'altshuler',
  ], 'בריאות'],

  // ── בידור ────────────────────────────────────────────────────────────────
  [[
    'netflix', 'נטפליקס', 'spotify', 'ספוטיפיי', 'disney', 'hbo',
    'apple tv', 'apple music', 'youtube', 'youtube premium',
    'steam', 'gaming', 'playstation', 'xbox', 'nintendo', 'twitch',
    'cinema', 'סינמה', 'קולנוע', 'yes planet', 'cinema city',
    'paramount', 'deezer', 'tidal', 'google play', 'app store',
    'theater', 'תיאטרון', 'concert', 'הופעה', 'event', 'אירוע',
    'כרטיס', 'ticket', 'live', 'show', 'museum', 'מוזיאון',
  ], 'בידור'],

  // ── קניות ────────────────────────────────────────────────────────────────
  [[
    'amazon', 'אמזון', 'aliexpress', 'ali express', 'ebay',
    'zara', 'זארה', 'h&m', 'castro', 'קסטרו', 'renuar', 'רנואר',
    'golf', 'גולף', 'fox', 'פוקס', 'factory 54',
    'ksp', 'ivory', 'אייבורי', 'ikea', 'איקאה',
    'shein', 'שאין', 'terminal', 'טרמינל',
    'adidas', 'nike', 'puma', 'under armour', 'new balance',
    'clothing', 'fashion', 'apparel', 'בגדים', 'נעליים', 'shoes',
    'mall', 'קניון', 'shopping', 'קניות', 'store', 'shop',
    'walmart', 'best buy', 'electronics', 'אלקטרוניקה',
    'mediamarkt', 'bug', 'idigital', 'apple store',
  ], 'קניות'],

  // ── חיסכון ───────────────────────────────────────────────────────────────
  [[
    'פיקדון', 'deposit', 'savings', 'חיסכון',
    'קרן השתלמות', 'keren hishtalmut', 'pension', 'פנסיה',
    'גמל', 'gemel', 'ביטוח חיים', 'life insurance',
    'investment', 'השקעה', 'קרן', 'fund',
  ], 'חיסכון'],
];

// ─── Main categorize function ─────────────────────────────────────────────────

export function categorize(description: string): { cat: CategoryKey; color: string; emoji: string } {
  const lower = (description || '').toLowerCase().trim();

  for (const [keywords, cat] of RULES) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return { cat, ...CATEGORIES[cat] };
      }
    }
  }

  return { cat: 'שונות', ...CATEGORIES['שונות'] };
}

// ─── Legacy exports (backward compat) ────────────────────────────────────────

export interface CategoryRule {
  kw: string[];
  cat: CategoryKey;
  color: string;
  emoji: string;
}

export const CAT_RULES: CategoryRule[] = RULES.map(([kw, cat]) => ({
  kw,
  cat,
  color: CATEGORIES[cat].color,
  emoji: CATEGORIES[cat].emoji,
}));

export const DEF_CAT = { cat: 'שונות' as CategoryKey, ...CATEGORIES['שונות'] };

export const ALL_CATS = Object.entries(CATEGORIES).map(([cat, meta]) => ({
  cat: cat as CategoryKey,
  ...meta,
}));

export const DEFAULT_BUDGET_PLAN: BudgetPlanItem[] = [
  { key: 'דיור',       pct: 30, color: '#64748B', emoji: '🏠' },
  { key: 'מזון ושוק',  pct: 15, color: '#22C55E', emoji: '🛒' },
  { key: 'תחבורה',    pct: 10, color: '#3B82F6', emoji: '🚌' },
  { key: 'חשבונות',   pct: 8,  color: '#EAB308', emoji: '💡' },
  { key: 'בריאות',    pct: 5,  color: '#14B8A6', emoji: '🏥' },
  { key: 'בידור',     pct: 7,  color: '#EC4899', emoji: '🎬' },
  { key: 'קניות',     pct: 5,  color: '#F59E0B', emoji: '🛍️' },
  { key: 'חיסכון',    pct: 10, color: '#8B5CF6', emoji: '💎' },
  { key: 'שונות',     pct: 10, color: '#9CA3AF', emoji: '📦' },
];

// 1:1 mapping — categories ARE the budget keys
export const CAT_TO_BUDGET: Record<string, string> = Object.fromEntries(
  Object.keys(CATEGORIES).map(k => [k, k])
);

export function calcBudget(netSalary: number, plan: BudgetPlanItem[]): BudgetPlanItem[] {
  const p = plan?.length ? plan : DEFAULT_BUDGET_PLAN;
  return p.map(b => ({ ...b, amount: Math.round((netSalary * b.pct) / 100) }));
}

export function spentPerBudget(txs: Transaction[], budget: BudgetPlanItem[], billingStart?: Date): Record<string, number> {
  const map: Record<string, number> = {};
  budget.forEach(b => { map[b.key] = 0; });
  const now = new Date();
  const cutoff = billingStart ?? new Date(now.getFullYear(), now.getMonth(), 1);
  txs
    .filter(t => t.amount < 0)
    .forEach(t => {
      const d = new Date(t.date);
      if (!isNaN(d.getTime()) && d >= cutoff) {
        const bk = CAT_TO_BUDGET[t.cat] || 'שונות';
        if (map[bk] !== undefined) map[bk] += Math.abs(t.amount);
        else if (map['שונות'] !== undefined) map['שונות'] += Math.abs(t.amount);
      }
    });
  return map;
}
