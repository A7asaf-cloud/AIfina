/**
 * Tests for AI/keyword transaction categorization used during CSV, Excel and image imports.
 */
import { describe, it, expect } from 'vitest';
import { categorize, CATEGORIES, CAT_RULES } from '../utils/categories';

// All valid category names the system accepts
const VALID_CATS = Object.keys(CATEGORIES);

// ─── categorize() keyword matching ───────────────────────────────────────────

describe('categorize() keyword matching', () => {
  it('identifies income correctly', () => {
    expect(categorize('משכורת חודשית מחברת X').cat).toBe('הכנסה');
    expect(categorize('salary payment').cat).toBe('הכנסה');
    expect(categorize('זיכוי מ-AMAZON').cat).toBe('הכנסה');
  });

  it('identifies food / supermarket correctly', () => {
    expect(categorize('שופרסל דיל תל אביב').cat).toBe('מזון ושוק');
    expect(categorize('רמי לוי').cat).toBe('מזון ושוק');
    expect(categorize('וולט - מסעדת הים').cat).toBe('מזון ושוק');
    expect(categorize('מקדונלד ראשון לציון').cat).toBe('מזון ושוק');
    expect(categorize('starbucks coffee').cat).toBe('מזון ושוק');
  });

  it('identifies housing correctly', () => {
    expect(categorize('שכר דירה חודש ינואר').cat).toBe('דיור');
    expect(categorize('ארנונה עיריית תל אביב').cat).toBe('דיור');
    expect(categorize('mortgage payment').cat).toBe('דיור');
  });

  it('identifies transportation correctly', () => {
    expect(categorize('תדלוק פז רעננה').cat).toBe('תחבורה');
    expect(categorize('gett taxi').cat).toBe('תחבורה');
    expect(categorize('חניה דיזנגוף סנטר').cat).toBe('תחבורה');
    expect(categorize('רב-קו טעינה').cat).toBe('תחבורה');
  });

  it('identifies utility bills correctly', () => {
    expect(categorize('חברת החשמל - חשבון').cat).toBe('חשבונות');
    expect(categorize('פרטנר סלולר').cat).toBe('חשבונות');
    expect(categorize('bezeq broadband').cat).toBe('חשבונות');
  });

  it('identifies health correctly', () => {
    expect(categorize('מכבי שירותי בריאות').cat).toBe('בריאות');
    expect(categorize('super pharm pharmacy').cat).toBe('בריאות');
    expect(categorize('ביטוח בריאות הראל').cat).toBe('בריאות');
  });

  it('identifies entertainment correctly', () => {
    expect(categorize('netflix subscription').cat).toBe('בידור');
    expect(categorize('spotify premium').cat).toBe('בידור');
    expect(categorize('cinema city ראשון').cat).toBe('בידור');
  });

  it('identifies shopping correctly', () => {
    expect(categorize('amazon.com purchase').cat).toBe('קניות');
    expect(categorize('ZARA בגדים').cat).toBe('קניות');
    expect(categorize('ikea furniture').cat).toBe('קניות');
  });

  it('identifies savings correctly', () => {
    expect(categorize('הפקדה לקרן השתלמות').cat).toBe('חיסכון');
    expect(categorize('pension fund deposit').cat).toBe('חיסכון');
  });

  it('falls back to שונות for unknown descriptions', () => {
    expect(categorize('עסקה לא מזוהה 12345').cat).toBe('שונות');
    expect(categorize('').cat).toBe('שונות');
  });
});

// ─── categorize() returns valid color + emoji ─────────────────────────────────

describe('categorize() result metadata', () => {
  it('always returns a valid category from CATEGORIES', () => {
    const samples = [
      'שופרסל', 'netflix', 'taxi gett', 'משכורת', 'ביטוח הראל',
      'unknown vendor xyz', 'חברת החשמל',
    ];
    for (const desc of samples) {
      const result = categorize(desc);
      expect(VALID_CATS).toContain(result.cat);
      expect(result.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(result.emoji).toBeTruthy();
    }
  });
});

// ─── CAT_RULES has full coverage ─────────────────────────────────────────────

describe('CAT_RULES completeness', () => {
  it('covers all system categories except שונות (fallback)', () => {
    const coveredCats = new Set(CAT_RULES.map(r => r.cat));
    const expectedCats = VALID_CATS.filter(c => c !== 'שונות');
    for (const cat of expectedCats) {
      expect(coveredCats).toContain(cat);
    }
  });

  it('every rule has at least one keyword', () => {
    for (const rule of CAT_RULES) {
      expect(rule.kw.length).toBeGreaterThan(0);
    }
  });
});

// ─── OCR valid categories ─────────────────────────────────────────────────────

describe('OCR category mapping', () => {
  it('all system categories are resolvable via CAT_RULES exact match', () => {
    // The OCR prompt now returns these exact system category names.
    // Simulate what ImportTab does: CAT_RULES.find(rule => rule.cat === aiCat)
    const ocrValidCats = [
      'הכנסה', 'מזון ושוק', 'דיור', 'תחבורה',
      'חשבונות', 'בריאות', 'בידור', 'קניות', 'חיסכון', 'שונות',
    ];
    for (const aiCat of ocrValidCats) {
      if (aiCat === 'שונות') continue; // fallback — not in CAT_RULES, handled separately
      const rule = CAT_RULES.find(r => r.cat === aiCat);
      expect(rule, `Expected CAT_RULES entry for category: ${aiCat}`).toBeDefined();
    }
  });

  it('OCR valid-cats list matches system CATEGORIES exactly', () => {
    const ocrCats = ['הכנסה', 'מזון ושוק', 'דיור', 'תחבורה', 'חשבונות', 'בריאות', 'בידור', 'קניות', 'חיסכון', 'שונות'];
    expect(ocrCats.sort()).toEqual([...VALID_CATS].sort());
  });
});

// ─── Server /api/categorize normalization logic (pure) ───────────────────────

describe('Server category normalization', () => {
  const VALID_SERVER = ['הכנסה','מזון ושוק','דיור','תחבורה','חשבונות','בריאות','בידור','קניות','חיסכון','שונות'];

  function normalizeServerResult(cat: string): string {
    return VALID_SERVER.includes(cat) ? cat : 'שונות';
  }

  it('passes through valid categories unchanged', () => {
    for (const cat of VALID_SERVER) {
      expect(normalizeServerResult(cat)).toBe(cat);
    }
  });

  it('normalizes invalid AI output to שונות', () => {
    expect(normalizeServerResult('סופרמרקט')).toBe('שונות');  // old wrong category
    expect(normalizeServerResult('מסעדות וקפה')).toBe('שונות');
    expect(normalizeServerResult('אחר')).toBe('שונות');
    expect(normalizeServerResult('')).toBe('שונות');
    expect(normalizeServerResult('undefined')).toBe('שונות');
  });
});
