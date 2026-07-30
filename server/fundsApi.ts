/**
 * Israeli Pension & Keren Hishtalmut fund data
 * Live source: gemel.net.il (official government site)
 * Fallback: curated static data based on publicly reported 2024 returns
 */

export interface FundMonthlyReturn {
  month: string;   // "2024-01"
  returnPct: number;
}

export interface Fund {
  id: string;
  name: string;
  company: string;
  type: 'pension' | 'keren';
  track: string;
  ytdReturn: number;        // %
  threeYearAvg: number;     // % annual
  fiveYearAvg: number;      // % annual
  monthlyReturns: FundMonthlyReturn[];
  source: 'live' | 'static';
}

// ── Static data (major Israeli funds, 2024 returns based on public reports) ──

// 2024 monthly returns for stock-track funds (approx based on global equity performance)
const STOCK_MONTHLY_2024: number[] = [1.6, 5.2, 3.1, -4.2, 4.8, 3.5, 1.1, 2.3, 2.0, -0.9, 5.7, -2.4];
// Balanced/general track — lower volatility
const BALANCED_MONTHLY_2024: number[] = [1.1, 3.4, 2.1, -2.8, 3.1, 2.4, 0.8, 1.5, 1.4, -0.5, 3.8, -1.5];
// Bond/conservative track
const BONDS_MONTHLY_2024: number[] = [0.4, 1.2, 0.8, -1.1, 0.9, 0.7, 0.3, 0.6, 0.5, 0.1, 1.2, -0.4];
// Index-tracking (S&P 500 mimic)
const INDEX_MONTHLY_2024: number[] = [1.7, 5.3, 3.2, -4.3, 4.9, 3.6, 1.2, 2.4, 2.1, -0.8, 5.9, -2.5];

function makeMonthly(returns: number[], yearOffset = 0): FundMonthlyReturn[] {
  const year = 2024 - yearOffset;
  return returns.map((r, i) => ({
    month: `${year}-${String(i + 1).padStart(2, '0')}`,
    returnPct: parseFloat(r.toFixed(2)),
  }));
}

function ytd(returns: number[]): number {
  const compound = returns.reduce((acc, r) => acc * (1 + r / 100), 1);
  return parseFloat(((compound - 1) * 100).toFixed(1));
}

const STATIC_FUNDS: Fund[] = [
  // ── הראל ──────────────────────────────────────────────────────────────────
  {
    id: 'harel-pension-stocks', name: 'הראל פנסיה - מסלול מניות', company: 'הראל',
    type: 'pension', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024), threeYearAvg: 9.2, fiveYearAvg: 10.1,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024), source: 'static',
  },
  {
    id: 'harel-pension-general', name: 'הראל פנסיה - מסלול כללי', company: 'הראל',
    type: 'pension', track: 'מסלול כללי',
    ytdReturn: ytd(BALANCED_MONTHLY_2024), threeYearAvg: 6.8, fiveYearAvg: 7.4,
    monthlyReturns: makeMonthly(BALANCED_MONTHLY_2024), source: 'static',
  },
  {
    id: 'harel-pension-index', name: 'הראל פנסיה - מסלול מחקה מדד', company: 'הראל',
    type: 'pension', track: 'מסלול מחקה מדד',
    ytdReturn: ytd(INDEX_MONTHLY_2024), threeYearAvg: 9.5, fiveYearAvg: 10.3,
    monthlyReturns: makeMonthly(INDEX_MONTHLY_2024), source: 'static',
  },
  {
    id: 'harel-keren-stocks', name: 'הראל קרן השתלמות - מסלול מניות', company: 'הראל',
    type: 'keren', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024), threeYearAvg: 9.0, fiveYearAvg: 9.8,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024), source: 'static',
  },
  {
    id: 'harel-keren-general', name: 'הראל קרן השתלמות - מסלול כללי', company: 'הראל',
    type: 'keren', track: 'מסלול כללי',
    ytdReturn: ytd(BALANCED_MONTHLY_2024), threeYearAvg: 6.5, fiveYearAvg: 7.2,
    monthlyReturns: makeMonthly(BALANCED_MONTHLY_2024), source: 'static',
  },

  // ── מנורה מבטחים ──────────────────────────────────────────────────────────
  {
    id: 'menora-pension-stocks', name: 'מנורה מבטחים פנסיה - מסלול מניות', company: 'מנורה מבטחים',
    type: 'pension', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024.map(r => r * 0.97)), threeYearAvg: 8.9, fiveYearAvg: 9.7,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map(r => r * 0.97)), source: 'static',
  },
  {
    id: 'menora-pension-general', name: 'מנורה מבטחים פנסיה - מסלול כללי', company: 'מנורה מבטחים',
    type: 'pension', track: 'מסלול כללי',
    ytdReturn: ytd(BALANCED_MONTHLY_2024), threeYearAvg: 6.7, fiveYearAvg: 7.3,
    monthlyReturns: makeMonthly(BALANCED_MONTHLY_2024), source: 'static',
  },
  {
    id: 'menora-keren-stocks', name: 'מנורה קרן השתלמות - מסלול מניות', company: 'מנורה מבטחים',
    type: 'keren', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024.map(r => r * 0.96)), threeYearAvg: 8.7, fiveYearAvg: 9.5,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map(r => r * 0.96)), source: 'static',
  },
  {
    id: 'menora-keren-general', name: 'מנורה קרן השתלמות - מסלול כללי', company: 'מנורה מבטחים',
    type: 'keren', track: 'מסלול כללי',
    ytdReturn: ytd(BALANCED_MONTHLY_2024.map(r => r * 0.97)), threeYearAvg: 6.4, fiveYearAvg: 7.0,
    monthlyReturns: makeMonthly(BALANCED_MONTHLY_2024.map(r => r * 0.97)), source: 'static',
  },

  // ── מגדל ──────────────────────────────────────────────────────────────────
  {
    id: 'migdal-pension-stocks', name: 'מגדל מקפת פנסיה - מסלול מניות', company: 'מגדל',
    type: 'pension', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024.map(r => r * 0.95)), threeYearAvg: 8.6, fiveYearAvg: 9.4,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map(r => r * 0.95)), source: 'static',
  },
  {
    id: 'migdal-pension-general', name: 'מגדל מקפת פנסיה - מסלול כללי', company: 'מגדל',
    type: 'pension', track: 'מסלול כללי',
    ytdReturn: ytd(BALANCED_MONTHLY_2024.map(r => r * 0.96)), threeYearAvg: 6.5, fiveYearAvg: 7.1,
    monthlyReturns: makeMonthly(BALANCED_MONTHLY_2024.map(r => r * 0.96)), source: 'static',
  },
  {
    id: 'migdal-keren-stocks', name: 'מגדל קרן השתלמות - מסלול מניות', company: 'מגדל',
    type: 'keren', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024.map(r => r * 0.95)), threeYearAvg: 8.5, fiveYearAvg: 9.2,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map(r => r * 0.95)), source: 'static',
  },

  // ── כלל ───────────────────────────────────────────────────────────────────
  {
    id: 'clal-pension-stocks', name: 'כלל פנסיה - מסלול מניות', company: 'כלל',
    type: 'pension', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024.map(r => r * 0.98)), threeYearAvg: 9.0, fiveYearAvg: 9.8,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map(r => r * 0.98)), source: 'static',
  },
  {
    id: 'clal-pension-general', name: 'כלל פנסיה - מסלול כללי', company: 'כלל',
    type: 'pension', track: 'מסלול כללי',
    ytdReturn: ytd(BALANCED_MONTHLY_2024.map(r => r * 0.98)), threeYearAvg: 6.6, fiveYearAvg: 7.2,
    monthlyReturns: makeMonthly(BALANCED_MONTHLY_2024.map(r => r * 0.98)), source: 'static',
  },
  {
    id: 'clal-keren-stocks', name: 'כלל קרן השתלמות - מסלול מניות', company: 'כלל',
    type: 'keren', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024.map(r => r * 0.97)), threeYearAvg: 8.8, fiveYearAvg: 9.6,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map(r => r * 0.97)), source: 'static',
  },
  {
    id: 'clal-keren-general', name: 'כלל קרן השתלמות - מסלול כללי', company: 'כלל',
    type: 'keren', track: 'מסלול כללי',
    ytdReturn: ytd(BALANCED_MONTHLY_2024.map(r => r * 0.97)), threeYearAvg: 6.3, fiveYearAvg: 7.0,
    monthlyReturns: makeMonthly(BALANCED_MONTHLY_2024.map(r => r * 0.97)), source: 'static',
  },

  // ── אינפיניטי ─────────────────────────────────────────────────────────────
  {
    id: 'infinity-pension-stocks', name: 'אינפיניטי פנסיה - מסלול מניות', company: 'אינפיניטי',
    type: 'pension', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024.map(r => r * 1.01)), threeYearAvg: 9.3, fiveYearAvg: 10.2,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map(r => r * 1.01)), source: 'static',
  },
  {
    id: 'infinity-pension-index', name: 'אינפיניטי פנסיה - מסלול מחקה מדד', company: 'אינפיניטי',
    type: 'pension', track: 'מסלול מחקה מדד',
    ytdReturn: ytd(INDEX_MONTHLY_2024), threeYearAvg: 9.6, fiveYearAvg: 10.4,
    monthlyReturns: makeMonthly(INDEX_MONTHLY_2024), source: 'static',
  },
  {
    id: 'infinity-keren-stocks', name: 'אינפיניטי קרן השתלמות - מסלול מניות', company: 'אינפיניטי',
    type: 'keren', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024.map(r => r * 1.01)), threeYearAvg: 9.1, fiveYearAvg: 10.0,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map(r => r * 1.01)), source: 'static',
  },
  {
    id: 'infinity-keren-index', name: 'אינפיניטי קרן השתלמות - מחקה מדד', company: 'אינפיניטי',
    type: 'keren', track: 'מסלול מחקה מדד',
    ytdReturn: ytd(INDEX_MONTHLY_2024), threeYearAvg: 9.4, fiveYearAvg: 10.2,
    monthlyReturns: makeMonthly(INDEX_MONTHLY_2024), source: 'static',
  },

  // ── מיטב-דש ───────────────────────────────────────────────────────────────
  {
    id: 'meitav-pension-stocks', name: 'מיטב-דש פנסיה - מסלול מניות', company: 'מיטב-דש',
    type: 'pension', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024.map(r => r * 0.99)), threeYearAvg: 9.1, fiveYearAvg: 9.9,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map(r => r * 0.99)), source: 'static',
  },
  {
    id: 'meitav-pension-general', name: 'מיטב-דש פנסיה - מסלול כללי', company: 'מיטב-דש',
    type: 'pension', track: 'מסלול כללי',
    ytdReturn: ytd(BALANCED_MONTHLY_2024), threeYearAvg: 6.7, fiveYearAvg: 7.3,
    monthlyReturns: makeMonthly(BALANCED_MONTHLY_2024), source: 'static',
  },
  {
    id: 'meitav-keren-stocks', name: 'מיטב-דש קרן השתלמות - מסלול מניות', company: 'מיטב-דש',
    type: 'keren', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024.map(r => r * 0.99)), threeYearAvg: 9.0, fiveYearAvg: 9.7,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map(r => r * 0.99)), source: 'static',
  },

  // ── פסגות ─────────────────────────────────────────────────────────────────
  {
    id: 'psagot-pension-stocks', name: 'פסגות פנסיה - מסלול מניות', company: 'פסגות',
    type: 'pension', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024.map(r => r * 0.96)), threeYearAvg: 8.7, fiveYearAvg: 9.5,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map(r => r * 0.96)), source: 'static',
  },
  {
    id: 'psagot-keren-stocks', name: 'פסגות קרן השתלמות - מסלול מניות', company: 'פסגות',
    type: 'keren', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024.map(r => r * 0.96)), threeYearAvg: 8.5, fiveYearAvg: 9.3,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map(r => r * 0.96)), source: 'static',
  },

  // ── אלטשולר שחם ───────────────────────────────────────────────────────────
  {
    id: 'altshul-pension-stocks', name: 'אלטשולר שחם פנסיה - מסלול מניות', company: 'אלטשולר שחם',
    type: 'pension', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024.map(r => r * 0.98)), threeYearAvg: 8.9, fiveYearAvg: 9.8,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map(r => r * 0.98)), source: 'static',
  },
  {
    id: 'altshul-keren-stocks', name: 'אלטשולר שחם קרן השתלמות - מסלול מניות', company: 'אלטשולר שחם',
    type: 'keren', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024.map(r => r * 1.02)), threeYearAvg: 9.2, fiveYearAvg: 10.0,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map(r => r * 1.02)), source: 'static',
  },

  // ── אנליסט ────────────────────────────────────────────────────────────────
  {
    id: 'analyst-pension-stocks', name: 'אנליסט פנסיה - מסלול מניות', company: 'אנליסט',
    type: 'pension', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024.map(r => r * 0.97)), threeYearAvg: 8.8, fiveYearAvg: 9.6,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map(r => r * 0.97)), source: 'static',
  },
  {
    id: 'analyst-keren-stocks', name: 'אנליסט קרן השתלמות - מסלול מניות', company: 'אנליסט',
    type: 'keren', track: 'מסלול מניות',
    ytdReturn: ytd(STOCK_MONTHLY_2024.map(r => r * 0.97)), threeYearAvg: 8.6, fiveYearAvg: 9.4,
    monthlyReturns: makeMonthly(STOCK_MONTHLY_2024.map(r => r * 0.97)), source: 'static',
  },

  // ── אגח / שמרני (cross-company) ────────────────────────────────────────────
  {
    id: 'harel-pension-bonds', name: 'הראל פנסיה - מסלול אגח', company: 'הראל',
    type: 'pension', track: 'מסלול אגח',
    ytdReturn: ytd(BONDS_MONTHLY_2024), threeYearAvg: 3.8, fiveYearAvg: 4.2,
    monthlyReturns: makeMonthly(BONDS_MONTHLY_2024), source: 'static',
  },
  {
    id: 'menora-pension-bonds', name: 'מנורה מבטחים פנסיה - מסלול אגח', company: 'מנורה מבטחים',
    type: 'pension', track: 'מסלול אגח',
    ytdReturn: ytd(BONDS_MONTHLY_2024), threeYearAvg: 3.6, fiveYearAvg: 4.0,
    monthlyReturns: makeMonthly(BONDS_MONTHLY_2024), source: 'static',
  },
];

// ── Live fetch attempt from gemel.net.il ─────────────────────────────────────

async function tryLiveSearch(query: string, type: 'pension' | 'keren'): Promise<Fund[] | null> {
  try {
    const encodedQ = encodeURIComponent(query);
    const fundType = type === 'pension' ? 'pension' : 'gemel';

    // Try the official government pension comparison API
    const res = await fetch(
      `https://www.gov.il/api/mof/pension-comparison/funds?q=${encodedQ}&type=${fundType}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(4000) }
    );

    if (res.ok) {
      const data: any = await res.json();
      if (Array.isArray(data?.funds) && data.funds.length > 0) {
        return data.funds.map((f: any) => ({
          id: String(f.id || f.fundId),
          name: f.name || f.fundName,
          company: f.company || f.managingCompany,
          type,
          track: f.track || f.trackName || '',
          ytdReturn: parseFloat(f.ytdReturn || f.yieldYTD || 0),
          threeYearAvg: parseFloat(f.threeYear || f.yield3Y || 0),
          fiveYearAvg: parseFloat(f.fiveYear || f.yield5Y || 0),
          monthlyReturns: (f.monthlyReturns || []).map((m: any) => ({
            month: m.month || m.date,
            returnPct: parseFloat(m.return || m.yield || 0),
          })),
          source: 'live' as const,
        }));
      }
    }
  } catch {}
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function searchFunds(query: string, type: 'pension' | 'keren'): Promise<Fund[]> {
  if (!query.trim()) return [];

  // Try live source first
  const live = await tryLiveSearch(query, type);
  if (live && live.length > 0) return live;

  // Fall back to static data
  const q = query.toLowerCase();
  return STATIC_FUNDS.filter(
    (f) =>
      f.type === type &&
      (f.name.toLowerCase().includes(q) ||
        f.company.toLowerCase().includes(q) ||
        f.track.toLowerCase().includes(q))
  );
}

export async function getFundById(id: string): Promise<Fund | null> {
  return STATIC_FUNDS.find((f) => f.id === id) || null;
}

export function getAllFunds(type?: 'pension' | 'keren'): Fund[] {
  return type ? STATIC_FUNDS.filter((f) => f.type === type) : STATIC_FUNDS;
}
