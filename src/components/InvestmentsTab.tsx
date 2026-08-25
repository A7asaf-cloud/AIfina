import { useState, useEffect, type FC } from 'react';
import {
  UserProfile,
  InvestmentState,
  StockHolding,
  SavingsAccount,
  MoneyMarketFund,
  StockHistoryItem,
  SnapshotItem,
} from '../types';
import { fmtILS, fmtUSD, fmtDate } from '../utils/formatters';
import { fetchStockQuoteClientSide } from '../utils/apiFallback';
import {
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
} from 'lucide-react';
import { ModalShell } from './ModalShell';

const STOCK_COLORS = [
  '#4A6FFF', '#00C48C', '#FF647C', '#9B59B6',
  '#FF9F43', '#54A0FF', '#00D2D3', '#FF6B6B',
];

interface InvestmentsTabProps {
  profile: UserProfile;
  investments: InvestmentState;
  snapshots: Record<string, SnapshotItem[]>;
  onUpdateInvestments: (data: Partial<InvestmentState>) => void;
  onUpdateSnapshots: (s: Record<string, SnapshotItem[]>) => void;
}

function FundCard({ fund, balance, onClear }: {
  fund: { id: string; name: string; company: string; track: string; ytdReturn: number; threeYearAvg: number; fiveYearAvg: number; monthlyReturns: { month: string; returnPct: number }[]; source: string };
  balance: number;
  onClear: () => void;
}) {
  const gain = balance * (fund.ytdReturn / 100);
  const last6 = fund.monthlyReturns.slice(-6);

  const MONTH_HE: Record<string, string> = {
    '01': 'ינו', '02': 'פבר', '03': 'מרץ', '04': 'אפר',
    '05': 'מאי', '06': 'יונ', '07': 'יול', '08': 'אוג',
    '09': 'ספט', '10': 'אוק', '11': 'נוב', '12': 'דצמ',
  };

  return (
    <div className="bg-card border border-line rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-start gap-3">
        <button onClick={onClear} aria-label="שנה קרן" className="shrink-0 text-xs text-muted hover:text-ink transition">✕ שנה קרן</button>
        <div className="min-w-0 text-right">
          <div className="text-sm font-bold text-ink break-words">{fund.name}</div>
          <div className="text-[11px] text-muted mt-0.5 break-words">{fund.company} · {fund.track}</div>
          {fund.source === 'static' && (
            <div className="text-[10px] text-[#FF9F43] mt-0.5">* נתוני 2024 — מקור: דוחות ציבוריים</div>
          )}
        </div>
      </div>

      {/* Returns summary */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="bg-surface rounded-xl p-2.5 text-center">
          <div className="text-[10px] text-muted">תשואה 2024</div>
          <div className={`text-sm font-black font-num ${fund.ytdReturn >= 0 ? 'text-income' : 'text-expense'}`}>
            {fund.ytdReturn >= 0 ? '+' : ''}{fund.ytdReturn}%
          </div>
        </div>
        <div className="bg-surface rounded-xl p-2.5 text-center">
          <div className="text-[10px] text-muted">ממוצע 3 שנים</div>
          <div className="text-sm font-black font-num text-primary">+{fund.threeYearAvg}%</div>
        </div>
        <div className="bg-surface rounded-xl p-2.5 text-center">
          <div className="text-[10px] text-muted">ממוצע 5 שנים</div>
          <div className="text-sm font-black font-num text-primary">+{fund.fiveYearAvg}%</div>
        </div>
      </div>

      {/* P&L calculation */}
      {balance > 0 && (
        <div className={`rounded-xl p-3 border ${gain >= 0 ? 'bg-income/10 border-income/20' : 'bg-expense/10 border-expense/20'}`}>
          <div className="flex justify-between text-xs">
            <span className="text-muted">יתרה נוכחית</span>
            <span className="font-bold text-ink font-num">{fmtILS(balance)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold mt-1">
            <span className={gain >= 0 ? 'text-income' : 'text-expense'}>רווח/הפסד 2024</span>
            <span className={`font-num ${gain >= 0 ? 'text-income' : 'text-expense'}`}>
              {gain >= 0 ? '+' : ''}{fmtILS(gain)}
            </span>
          </div>
        </div>
      )}

      {/* Monthly returns bar chart */}
      {last6.length > 0 && (
        <div>
          <div className="text-[10px] text-muted mb-2">תשואות חודשיות (6 חודשים אחרונים)</div>
          <div className="flex items-end gap-1.5 h-10">
            {last6.map((m) => {
              const monthKey = m.month.split('-')[1];
              const isPos = m.returnPct >= 0;
              const height = Math.min(100, Math.abs(m.returnPct) * 8);
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="text-[9px] font-num text-muted">{m.returnPct > 0 ? '+' : ''}{m.returnPct.toFixed(1)}%</div>
                  <div className="w-full flex items-end justify-center" style={{ height: '24px' }}>
                    <div
                      className={`w-full rounded-sm ${isPos ? 'bg-income' : 'bg-expense'}`}
                      style={{ height: `${Math.max(2, height)}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-muted">{MONTH_HE[monthKey] || monthKey}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export const InvestmentsTab: FC<InvestmentsTabProps> = ({
  profile,
  investments,
  snapshots,
  onUpdateInvestments,
  onUpdateSnapshots,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'returns' | 'stocks' | 'keren' | 'pension' | 'savings' | 'mm'
  >('stocks');

  const [usdRate, setUsdRate] = useState<number>(3.72);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string | null>(null);
  const [marketSummary, setMarketSummary] = useState<
    Array<{ symbol: string; name: string; price: number; changePercent: number; type: string; currency?: string }>
  >([
    { symbol: 'SPY', name: 'S&P 500 (SPY)', price: 602.15, changePercent: 0.65, type: 'stock' },
    { symbol: 'QQQ', name: 'Nasdaq (QQQ)', price: 520.40, changePercent: 1.12, type: 'stock' },
    { symbol: 'BTC', name: 'Bitcoin (BTC)', price: 64371.02, changePercent: 0.81, type: 'crypto' },
    { symbol: 'ETH', name: 'Ethereum (ETH)', price: 3450.20, changePercent: 1.35, type: 'crypto' },
  ]);

  useEffect(() => {
    const loadMarketSummary = async () => {
      try {
        const res = await fetch('/api/market-summary');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.indices) {
            setMarketSummary(data.indices);
          }
        }
      } catch (e) {
        console.warn('Market summary fetch error:', e);
      }
    };

    const loadForex = async () => {
      try {
        const res = await fetch('/api/forex');
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && data.rates?.USD_ILS) {
            setUsdRate(data.rates.USD_ILS);
            return;
          }
        }
      } catch {
        // Fallback
      }

      try {
        const directRes = await fetch('https://open.er-api.com/v6/latest/USD');
        if (directRes.ok) {
          const data = await directRes.json();
          if (data.rates?.ILS) {
            setUsdRate(parseFloat(data.rates.ILS.toFixed(4)));
          }
        }
      } catch (err) {
        console.error('Forex direct fetch error:', err);
      }
    };

    loadMarketSummary();
    loadForex();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'stocks' && investments.portfolioHoldings && investments.portfolioHoldings.length > 0) {
      handleRefreshStockPrices();
      const interval = setInterval(() => {
        handleRefreshStockPrices();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [activeSubTab, investments.portfolioHoldings?.length]);

  const handleRefreshStockPrices = async () => {
    setIsRefreshing(true);
    const holdings = investments.portfolioHoldings || [];
    if (holdings.length === 0) {
      setIsRefreshing(false);
      return;
    }

    try {
      const updatedHoldings = await Promise.all(
        holdings.map(async (holding) => {
          try {
            let data: any;
            try {
              const res = await fetch(`/api/stock-quote/${encodeURIComponent(holding.symbol)}`);
              const contentType = res.headers.get('content-type') || '';
              if (res.status === 404) {
                data = await fetchStockQuoteClientSide(holding.symbol);
              } else if (res.ok && contentType.includes('application/json')) {
                data = await res.json();
              }
            } catch (e) {
              try {
                data = await fetchStockQuoteClientSide(holding.symbol);
              } catch (err) {
                console.error(`Failed client-side fetch for ${holding.symbol}:`, err);
              }
            }

            if (data && data.success && data.price) {
              return {
                ...holding,
                currentPrice: data.price,
                changePercent: data.changePercent,
                name: data.companyName || holding.name,
              };
            }
          } catch (e) {
            console.error(`Failed to fetch price for ${holding.symbol}:`, e);
          }
          return holding;
        })
      );

      onUpdateInvestments({ portfolioHoldings: updatedHoldings });
      setLastRefreshedTime(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error('Stock refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);

  const [buySymbol, setBuySymbol] = useState('');
  const [buyName, setBuyName] = useState('');
  const [buyShares, setBuyShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState<{ success: boolean; text: string } | null>(null);

  const fetchQuoteForSymbol = async (symToFetch: string) => {
    const cleanSym = symToFetch.trim();
    if (!cleanSym) return;
    setIsFetchingQuote(true);
    setQuoteMessage(null);

    let data: any;
    try {
      try {
        const res = await fetch(`/api/stock-quote/${encodeURIComponent(cleanSym)}`);
        const contentType = res.headers.get('content-type') || '';
        if (res.status === 404) {
          data = await fetchStockQuoteClientSide(cleanSym);
        } else if (res.ok && contentType.includes('application/json')) {
          data = await res.json();
        } else {
          throw new Error('Not found');
        }
      } catch {
        data = await fetchStockQuoteClientSide(cleanSym);
      }

      if (data && data.success && data.price) {
        setBuyPrice(String(data.price));
        if (data.symbol && data.symbol !== cleanSym) {
          setBuySymbol(data.symbol);
        }
        if (data.companyName) {
          setBuyName(data.companyName);
        }
        const curSymbol = data.currency === 'ILS' ? '₪' : '$';
        setQuoteMessage({
          success: true,
          text: `🟢 מחיר שוק בלייב: ${curSymbol}${data.price} (${data.companyName || data.symbol})`,
        });
      } else {
        setQuoteMessage({
          success: false,
          text: `לא נמצא מחיר בלייב עבור ${cleanSym} — תוכל להזין מחיר ידנית`,
        });
      }
    } catch (err: any) {
      setQuoteMessage({
        success: false,
        text: `לא נמצא מחיר עבור ${cleanSym} — תוכל להזין מחיר ידנית`,
      });
    } finally {
      setIsFetchingQuote(false);
    }
  };

  const [selectedHoldingForSell, setSelectedHoldingForSell] = useState<StockHolding | null>(null);
  const [sellShares, setSellShares] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellError, setSellError] = useState<string | null>(null);

  const openSellModal = (h: StockHolding) => {
    setSelectedHoldingForSell(h);
    setSellShares(String(h.shares));
    setSellPrice(String(h.currentPrice || h.avgCost || 0));
    setSellError(null);
    setShowSellModal(true);
  };

  const handleSellStock = () => {
    if (!selectedHoldingForSell) return;
    const sharesToSell = parseFloat(sellShares);
    const pricePerShare = parseFloat(sellPrice);

    if (isNaN(sharesToSell) || sharesToSell <= 0 || sharesToSell > selectedHoldingForSell.shares) {
      setSellError(`כמות מניות למכירה אינה תקינה. תוכל למכור עד ${selectedHoldingForSell.shares} מניות.`);
      return;
    }
    if (isNaN(pricePerShare) || pricePerShare <= 0) {
      setSellError('מחיר למניה אינו תקין.');
      return;
    }
    setSellError(null);

    const totalRevenueUSD = sharesToSell * pricePerShare;
    const remainingShares = selectedHoldingForSell.shares - sharesToSell;

    let updatedHoldings: StockHolding[];
    if (remainingShares <= 0.0001) {
      updatedHoldings = holdings.filter((h) => h.id !== selectedHoldingForSell.id);
    } else {
      updatedHoldings = holdings.map((h) =>
        h.id === selectedHoldingForSell.id
          ? { ...h, shares: parseFloat(remainingShares.toFixed(4)) }
          : h
      );
    }

    const historyItem: StockHistoryItem = {
      id: Date.now(),
      type: 'sell',
      symbol: selectedHoldingForSell.symbol,
      shares: sharesToSell,
      price: pricePerShare,
      cost: totalRevenueUSD,
      date: new Date().toISOString().split('T')[0],
    };

    onUpdateInvestments({
      portfolioHoldings: updatedHoldings,
      portfolioCash: cashUSD + totalRevenueUSD,
      portfolioHistory: [historyItem, ...(investments.portfolioHistory || [])],
    });

    setShowSellModal(false);
    setSelectedHoldingForSell(null);
    setSellShares('');
    setSellPrice('');
  };

  const handleDeleteStockHolding = (id: string | number, symbol: string) => {
    onUpdateInvestments({
      portfolioHoldings: holdings.filter((h) => h.id !== id),
    });
  };

  const [depositAmount, setDepositAmount] = useState('');

  interface FundResult {
    id: string; name: string; company: string; type: string; track: string;
    ytdReturn: number; threeYearAvg: number; fiveYearAvg: number;
    monthlyReturns: { month: string; returnPct: number }[];
    source: 'live' | 'static';
  }

  const [kerenInput, setKerenInput] = useState(
    investments.kerenValue ? String(investments.kerenValue) : ''
  );
  const [kerenStartDate, setKerenStartDate] = useState<string>(() => snapshots?.kerenValue?.[0]?.date || '');
  const [pensionStartDate, setPensionStartDate] = useState<string>(() => snapshots?.pensionValue?.[0]?.date || '');
  const [pensionInput, setPensionInput] = useState(
    investments.pensionValue ? String(investments.pensionValue) : ''
  );
  const [kerenTrack, setKerenTrack] = useState(investments.kerenTrack || '');
  const [pensionTrack, setPensionTrack] = useState(investments.pensionTrack || '');

  const [kerenSearch, setKerenSearch]           = useState('');
  const [kerenFunds, setKerenFunds]             = useState<FundResult[]>([]);
  const [kerenSelected, setKerenSelected]       = useState<FundResult | null>(null);
  const [kerenSearching, setKerenSearching]     = useState(false);

  const [pensionSearch, setPensionSearch]       = useState('');
  const [pensionFunds, setPensionFunds]         = useState<FundResult[]>([]);
  const [pensionSelected, setPensionSelected]   = useState<FundResult | null>(null);
  const [pensionSearching, setPensionSearching] = useState(false);

  async function searchFunds(q: string, type: 'keren' | 'pension', setFunds: (f: FundResult[]) => void, setSearching: (b: boolean) => void) {
    setSearching(true);
    try {
      const url = q.trim() ? `/api/funds/search?q=${encodeURIComponent(q)}&type=${type}` : `/api/funds/all?type=${type}`;
      const res = await fetch(url);
      if (res.ok) setFunds(await res.json());
    } catch {}
    setSearching(false);
  }

  useEffect(() => {
    const t = setTimeout(() => searchFunds(kerenSearch, 'keren', setKerenFunds, setKerenSearching), 300);
    return () => clearTimeout(t);
  }, [kerenSearch]);

  useEffect(() => {
    const t = setTimeout(() => searchFunds(pensionSearch, 'pension', setPensionFunds, setPensionSearching), 300);
    return () => clearTimeout(t);
  }, [pensionSearch]);

  useEffect(() => {
    searchFunds('', 'keren', setKerenFunds, setKerenSearching);
    searchFunds('', 'pension', setPensionFunds, setPensionSearching);
  }, []);

  const [showAddSavings, setShowAddSavings] = useState(false);
  const [savName, setSavName] = useState('');
  const [savBank, setSavBank] = useState('');
  const [savVal, setSavVal] = useState('');
  const [savRate, setSavRate] = useState('');

  const [showAddMM, setShowAddMM] = useState(false);
  const [mmName, setMmName] = useState('');
  const [mmVal, setMmVal] = useState('');
  const [mmYield, setMmYield] = useState('');

  const holdings = investments.portfolioHoldings || [];
  const cashUSD = investments.portfolioCash || 0;

  const totalStockCostBasisUSD = holdings.reduce(
    (sum, h) => sum + h.shares * h.avgCost,
    0
  );
  const totalStockValUSD = holdings.reduce(
    (sum, h) => sum + h.shares * (h.currentPrice || h.avgCost || 0),
    0
  );

  const totalPortUSD = totalStockValUSD + cashUSD;
  const totalPortILS = totalPortUSD * usdRate;

  const gross = profile.grossSalary || 0;
  const kerenMonthlyEst = (gross * (profile.kerenEmp + profile.kerenEr)) / 100;
  const pensionMonthlyEst = (gross * (profile.pensionEmp + profile.pensionEr)) / 100;

  const handleDepositCash = () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;

    const newCash = cashUSD + amt;
    const historyItem: StockHistoryItem = {
      id: Date.now(),
      type: 'deposit',
      amount: amt,
      date: new Date().toISOString().split('T')[0],
    };

    onUpdateInvestments({
      portfolioCash: newCash,
      portfolioHistory: [historyItem, ...(investments.portfolioHistory || [])],
    });

    setDepositAmount('');
    setShowDepositModal(false);
  };

  const handleBuyStock = () => {
    const shares = parseFloat(buyShares);
    const price = parseFloat(buyPrice);
    if (!buySymbol.trim() || isNaN(shares) || isNaN(price) || shares <= 0 || price <= 0) return;

    const sym = buySymbol.trim().toUpperCase();
    const existing = holdings.find((h) => h.symbol === sym);

    let updatedHoldings: StockHolding[];
    if (existing) {
      const totalShares = existing.shares + shares;
      const newAvgCost =
        (existing.shares * existing.avgCost + shares * price) / totalShares;
      updatedHoldings = holdings.map((h) =>
        h.id === existing.id
          ? { ...h, shares: totalShares, avgCost: newAvgCost, currentPrice: h.currentPrice || price }
          : h
      );
    } else {
      updatedHoldings = [
        ...holdings,
        {
          id: Date.now(),
          symbol: sym,
          name: buyName.trim() || sym,
          shares,
          avgCost: price,
          currentPrice: price,
          color: STOCK_COLORS[holdings.length % STOCK_COLORS.length],
        },
      ];
    }

    const historyItem: StockHistoryItem = {
      id: Date.now(),
      type: 'buy',
      symbol: sym,
      shares,
      price,
      cost: shares * price,
      date: new Date().toISOString().split('T')[0],
    };

    onUpdateInvestments({
      portfolioHoldings: updatedHoldings,
      portfolioHistory: [historyItem, ...(investments.portfolioHistory || [])],
    });

    setBuySymbol('');
    setBuyName('');
    setBuyShares('');
    setBuyPrice('');
    setShowBuyModal(false);
  };

  const handleSaveKeren = () => {
    const v = parseFloat(kerenInput);
    if (!isNaN(v) && v >= 0) {
      onUpdateInvestments({ kerenValue: v, kerenTrack: kerenTrack || undefined });
      if (kerenStartDate) {
        const existingSnaps = snapshots?.kerenValue || [];
        const hasDate = existingSnaps.some(s => s.date === kerenStartDate);
        if (!hasDate) {
          const newSnaps = { ...snapshots, kerenValue: [{ date: kerenStartDate, value: v }, ...existingSnaps.filter(s => s.date !== kerenStartDate)].sort((a, b) => a.date.localeCompare(b.date)) };
          onUpdateSnapshots(newSnaps);
        }
      }
    }
  };

  const handleSavePension = () => {
    const v = parseFloat(pensionInput);
    if (!isNaN(v) && v >= 0) {
      onUpdateInvestments({ pensionValue: v, pensionTrack: pensionTrack || undefined });
      if (pensionStartDate) {
        const existingSnaps = snapshots?.pensionValue || [];
        const hasDate = existingSnaps.some(s => s.date === pensionStartDate);
        if (!hasDate) {
          const newSnaps = { ...snapshots, pensionValue: [{ date: pensionStartDate, value: v }, ...existingSnaps.filter(s => s.date !== pensionStartDate)].sort((a, b) => a.date.localeCompare(b.date)) };
          onUpdateSnapshots(newSnaps);
        }
      }
    }
  };

  const handleAddSavings = () => {
    const val = parseFloat(savVal);
    if (!savName.trim() || isNaN(val) || val <= 0) return;

    const newAcc: SavingsAccount = {
      id: Date.now(),
      name: savName.trim(),
      bank: savBank.trim() || 'בנק',
      value: val,
      rate: parseFloat(savRate) || 0,
    };

    onUpdateInvestments({
      savings: [...(investments.savings || []), newAcc],
    });

    setSavName('');
    setSavBank('');
    setSavVal('');
    setSavRate('');
    setShowAddSavings(false);
  };

  const handleDeleteSavings = (id: string | number) => {
    onUpdateInvestments({
      savings: (investments.savings || []).filter((s) => s.id !== id),
    });
  };

  const handleAddMM = () => {
    const val = parseFloat(mmVal);
    if (!mmName.trim() || isNaN(val) || val <= 0) return;

    const newFund: MoneyMarketFund = {
      id: Date.now(),
      name: mmName.trim(),
      value: val,
      yield: parseFloat(mmYield) || 0,
    };

    onUpdateInvestments({
      moneyMarket: [...(investments.moneyMarket || []), newFund],
    });

    setMmName('');
    setMmVal('');
    setMmYield('');
    setShowAddMM(false);
  };

  const handleDeleteMM = (id: string | number) => {
    onUpdateInvestments({
      moneyMarket: (investments.moneyMarket || []).filter((f) => f.id !== id),
    });
  };

  const SUB_TABS = [
    { id: 'stocks', label: 'מניות', emoji: '📊' },
    { id: 'keren', label: 'קה"ש', emoji: '📈' },
    { id: 'pension', label: 'פנסיה', emoji: '🏛️' },
    { id: 'savings', label: 'חסכונות', emoji: '🏦' },
    { id: 'mm', label: 'ק.כספית', emoji: '💵' },
  ] as const;

  return (
    <div className="space-y-4 pb-24 text-right animate-fade-in">
      {/* Live Market Overview Ticker Bar */}
      {marketSummary && marketSummary.length > 0 && (
        <div className="bg-card border border-line rounded-2xl p-3 shadow-sm space-y-1.5">
          <div className="flex flex-wrap justify-between items-center gap-1 text-[11px] text-muted font-semibold px-1">
            <span className="flex min-w-0 items-center gap-1.5 text-ink">
              <span className="w-2 h-2 rounded-full bg-income animate-pulse"></span>
              מדדי שוק, מט״ח וקריפטו בלייב (API)
            </span>
            <span className="shrink-0 text-[10px] text-muted">לחץ לציטוט מהיר</span>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-0.5">
            {marketSummary.map((m) => {
              const isPos = m.changePercent >= 0;
              return (
                <button
                  key={m.symbol}
                  onClick={() => {
                    if (m.type !== 'forex') {
                      setBuySymbol(m.symbol);
                      setShowBuyModal(true);
                      fetchQuoteForSymbol(m.symbol);
                    }
                  }}
                  className="flex-shrink-0 bg-surface hover:bg-card border border-line px-3 py-1.5 rounded-xl transition-all text-right cursor-pointer group"
                >
                  <div className="text-[11px] font-extrabold text-ink group-hover:text-income flex items-center gap-1">
                    <span>{m.name}</span>
                    <span className="text-[9px] px-1 bg-surface rounded text-muted font-num">
                      {m.symbol}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-black font-num text-ink">
                      {m.currency === 'ILS' ? `₪${m.price}` : `$${m.price}`}
                    </span>
                    <span
                      className={`text-[10px] font-bold font-num ${
                        isPos ? 'text-income' : 'text-expense'
                      }`}
                    >
                      {isPos ? '+' : ''}
                      {m.changePercent}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex bg-card border border-line p-1.5 rounded-2xl overflow-x-auto scrollbar-hide gap-1">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`shrink-0 py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === t.id
                ? 'bg-primary text-white shadow-md'
                : 'text-muted hover:text-ink'
            }`}
          >
            <span>{t.emoji}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ── STOCKS PORTFOLIO ── */}
      {activeSubTab === 'stocks' && (
        <div className="space-y-4">
          {/* Summary Hero */}
          <div className="bg-card border border-line rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex flex-wrap justify-between items-start gap-3">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-muted">📊 תיק מניות</span>
                <h2 className="text-2xl sm:text-3xl font-black text-ink font-num mt-1 break-all">
                  {fmtUSD(totalPortUSD)}
                </h2>
                <div className="text-[11px] text-muted font-num mt-0.5">
                  {fmtILS(totalPortILS)} · ₪{usdRate.toFixed(2)}/$
                  {lastRefreshedTime && (
                    <span className="text-income font-semibold mr-1">🟢 {lastRefreshedTime}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button onClick={handleRefreshStockPrices} disabled={isRefreshing}
                  className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl border border-primary/30 flex items-center gap-1 cursor-pointer disabled:opacity-50">
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? '...' : 'רענן'}</span>
                </button>
                <button onClick={() => setShowDepositModal(true)}
                  className="px-2.5 py-1.5 bg-surface hover:bg-card text-income text-xs font-bold rounded-xl border border-line cursor-pointer">
                  💵 הפקד
                </button>
                <button onClick={() => setShowBuyModal(true)}
                  className="px-2.5 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer">
                  🟢 קנה
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-line text-xs">
              <div className="bg-surface p-2 rounded-xl border border-line">
                <div className="text-muted text-[10px]">עלות</div>
                <div className="font-bold text-ink font-num mt-0.5 text-[11px] break-all">{fmtUSD(totalStockCostBasisUSD)}</div>
              </div>
              <div className="bg-surface p-2 rounded-xl border border-line">
                <div className="text-muted text-[10px]">שווי</div>
                <div className="font-bold text-income font-num mt-0.5 text-[11px] break-all">{fmtUSD(totalStockValUSD)}</div>
              </div>
              <div className="bg-surface p-2 rounded-xl border border-line">
                <div className="text-muted text-[10px]">מזומן</div>
                <div className="font-bold text-ink font-num mt-0.5 text-[11px] break-all">{fmtUSD(cashUSD)}</div>
              </div>
            </div>
          </div>

          {/* Holdings Table */}
          <div className="bg-card border border-line rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-ink text-sm">החזקות קיימות בתיק</h3>

            {holdings.length === 0 ? (
              <div className="text-center py-8 text-muted text-xs">
                אין ניירות ערך בתיק עדיין — לחץ "קנה נייר" להוספת מניה
              </div>
            ) : (
              <div className="space-y-3">
                {holdings.map((h) => {
                  const livePrice = h.currentPrice || h.avgCost || 0;
                  const valUSD = h.shares * livePrice;
                  const gainUSD = (livePrice - h.avgCost) * h.shares;
                  const gainPct = h.avgCost ? ((livePrice - h.avgCost) / h.avgCost) * 100 : 0;
                  const isPositive = gainUSD >= 0;

                  return (
                    <div key={h.id} className="bg-surface border border-line rounded-2xl p-4 space-y-3">
                      {/* Row 1: symbol + value */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-xs flex-shrink-0"
                               style={{ backgroundColor: h.color + '20', color: h.color }}>
                            {h.symbol.slice(0, 4)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-ink truncate">{h.symbol}</div>
                            <div className="text-xs text-muted mt-0.5 leading-snug line-clamp-2 break-words">{h.name}</div>
                          </div>
                        </div>
                        <div className="max-w-[48%] text-left flex-shrink-0">
                          <div className="text-base font-bold text-ink font-num">{fmtUSD(valUSD)}</div>
                          <div className={`text-xs font-bold font-num mt-0.5 break-words ${isPositive ? 'text-income' : 'text-expense'}`}>
                            {isPositive ? '+' : ''}{fmtUSD(gainUSD)} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%)
                          </div>
                        </div>
                      </div>

                      {/* Row 2: details + actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[11px] text-muted leading-relaxed min-w-0 break-words">
                          <span>{h.shares} יח׳ · ${livePrice.toFixed(2)} · ממוצע ${h.avgCost.toFixed(2)}</span>
                          {h.changePercent !== undefined && (
                            <span className={`mr-1 font-bold ${h.changePercent >= 0 ? 'text-income' : 'text-expense'}`}>
                              · {h.changePercent >= 0 ? '+' : ''}{h.changePercent.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => openSellModal(h)}
                            className="px-2.5 py-1 bg-expense/10 hover:bg-expense/20 text-expense border border-expense/30 text-xs font-bold rounded-lg transition-all cursor-pointer">
                            מכור
                          </button>
                          <button onClick={() => handleDeleteStockHolding(h.id, h.symbol)}
                            aria-label={`מחק מניה ${h.symbol}`}
                            className="p-1.5 text-muted hover:text-expense hover:bg-surface rounded-lg transition-all cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── KEREN HISHTALMUT ── */}
      {activeSubTab === 'keren' && (
        <div className="bg-card border border-line rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
              📈
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">קרן השתלמות</h3>
              <p className="text-xs text-muted">מעקב שווי פטור ממס</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {/* Current value */}
            <div>
              <label className="block text-[10px] font-semibold text-muted mb-1">תאריך תחילת חיסכון</label>
              <input type="date" value={kerenStartDate} onChange={(e) => setKerenStartDate(e.target.value)}
                className="w-full bg-surface border border-line focus:border-[#FF9F43] rounded-xl px-4 py-2.5 text-ink text-sm outline-none mb-3"
                max={new Date().toISOString().split('T')[0]} />
              <label className="block text-xs font-semibold text-ink mb-1.5">יתרה נוכחית בקרן (₪)</label>
              <div className="flex gap-2">
                <input type="number" value={kerenInput} onChange={(e) => setKerenInput(e.target.value)}
                  placeholder="85000"
                  className="flex-1 bg-surface border border-line focus:border-primary rounded-xl px-4 py-3 text-ink text-sm outline-none font-num" />
                <button onClick={handleSaveKeren}
                  className="px-5 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl cursor-pointer">
                  עדכן
                </button>
              </div>
            </div>

            {/* Fund search */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">חפש קרן השתלמות</label>
              <input type="text" value={kerenSearch} onChange={e => setKerenSearch(e.target.value)}
                placeholder="הראל, מנורה, אינפיניטי, כלל..."
                className="w-full bg-surface border border-line focus:border-primary rounded-xl px-4 py-3 text-ink text-sm outline-none mb-2" />

              {kerenSelected ? (
                <FundCard fund={kerenSelected} balance={parseFloat(kerenInput) || investments.kerenValue || 0}
                  onClear={() => setKerenSelected(null)} />
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {kerenSearching && <div className="text-xs text-muted text-center py-2">מחפש...</div>}
                  {kerenFunds.map(f => (
                    <button key={f.id} onClick={() => setKerenSelected(f)}
                      className="w-full text-right bg-surface hover:bg-card border border-line hover:border-primary/40 rounded-xl px-3 py-2.5 transition-all cursor-pointer">
                      <div className="text-xs font-bold text-ink">{f.name}</div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[11px] text-muted">{f.company} · {f.track}</span>
                        <span className={`text-[11px] font-bold font-num ${f.ytdReturn >= 0 ? 'text-income' : 'text-expense'}`}>
                          {f.ytdReturn >= 0 ? '+' : ''}{f.ytdReturn}% (2024)
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Monthly deduction + accumulation */}
            {profile.hasKeren && profile.grossSalary > 0 && (
              <div className="bg-surface border border-line rounded-2xl p-4 space-y-2">
                <div className="text-xs font-bold text-ink mb-3">הפרשה חודשית מהמשכורת</div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">עובד ({profile.kerenEmp}%)</span>
                  <span className="font-bold text-ink font-num">{fmtILS(profile.grossSalary * profile.kerenEmp / 100)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">מעסיק ({profile.kerenEr}%)</span>
                  <span className="font-bold text-ink font-num">{fmtILS(profile.grossSalary * profile.kerenEr / 100)}</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-line">
                  <span className="text-ink font-bold">סה"כ חודשי</span>
                  <span className="font-bold text-income font-num">{fmtILS(kerenMonthlyEst)}</span>
                </div>
              </div>
            )}
            {/* Accumulation history */}
            {investments.kerenValue > 0 && (() => {
              const snaps = (snapshots?.kerenValue || []).slice().sort((a, b) => a.date.localeCompare(b.date));
              const last = snaps[snaps.length - 1];
              const monthsCount = snaps.length;
              const firstDate = snaps[0]?.date;
              return (
                <div className="bg-gradient-to-br from-amber-50 to-card border border-amber-200/40 rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-bold text-[#FF9F43]">📈 הצטברות עד עכשיו</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-lg font-black text-ink font-num">{fmtILS(investments.kerenValue)}</div>
                      <div className="text-[10px] text-muted">יתרה כוללת</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-black text-[#FF9F43] font-num">{monthsCount}</div>
                      <div className="text-[10px] text-muted">חודשים</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-ink">{last?.date || '—'}</div>
                      <div className="text-[10px] text-muted">הפקדה אחרונה</div>
                    </div>
                  </div>
                  {firstDate && <div className="text-[10px] text-muted text-center">מאז {firstDate}</div>}
                  {snaps.length === 0 && <div className="text-[10px] text-[#FF9F43]/70 text-center pt-1">הגדר תאריך תחילת חיסכון ולחץ עדכן</div>}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── PENSION ── */}
      {activeSubTab === 'pension' && (
        <div className="bg-card border border-line rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#9B59B6]/10 text-[#9B59B6] flex items-center justify-center text-2xl font-bold">
              🏛️
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">קרן פנסיה</h3>
              <p className="text-xs text-muted">חיסכון ארוך טווח לגיל פרישה</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {/* Current value */}
            <div>
              <label className="block text-[10px] font-semibold text-muted mb-1">תאריך תחילת חיסכון</label>
              <input type="date" value={pensionStartDate} onChange={(e) => setPensionStartDate(e.target.value)}
                className="w-full bg-surface border border-line focus:border-[#9B59B6] rounded-xl px-4 py-2.5 text-ink text-sm outline-none mb-3"
                max={new Date().toISOString().split('T')[0]} />
              <label className="block text-xs font-semibold text-ink mb-1.5">יתרה נוכחית בפנסיה (₪)</label>
              <div className="flex gap-2">
                <input type="number" value={pensionInput} onChange={(e) => setPensionInput(e.target.value)}
                  placeholder="240000"
                  className="flex-1 bg-surface border border-line focus:border-[#9B59B6] rounded-xl px-4 py-3 text-ink text-sm outline-none font-num" />
                <button onClick={handleSavePension}
                  className="px-5 bg-[#9B59B6] hover:bg-[#9B59B6]/90 text-white font-bold text-sm rounded-xl cursor-pointer">
                  עדכן
                </button>
              </div>
            </div>

            {/* Fund search */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">חפש קרן פנסיה</label>
              <input type="text" value={pensionSearch} onChange={e => setPensionSearch(e.target.value)}
                placeholder="הראל, מנורה, אינפיניטי, כלל, מגדל..."
                className="w-full bg-surface border border-line focus:border-[#9B59B6] rounded-xl px-4 py-3 text-ink text-sm outline-none mb-2" />

              {pensionSelected ? (
                <FundCard fund={pensionSelected} balance={parseFloat(pensionInput) || investments.pensionValue || 0}
                  onClear={() => setPensionSelected(null)} />
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {pensionSearching && <div className="text-xs text-muted text-center py-2">מחפש...</div>}
                  {pensionFunds.map(f => (
                    <button key={f.id} onClick={() => setPensionSelected(f)}
                      className="w-full text-right bg-surface hover:bg-card border border-line hover:border-[#9B59B6]/40 rounded-xl px-3 py-2.5 transition-all cursor-pointer">
                      <div className="text-xs font-bold text-ink">{f.name}</div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[11px] text-muted">{f.company} · {f.track}</span>
                        <span className={`text-[11px] font-bold font-num ${f.ytdReturn >= 0 ? 'text-income' : 'text-expense'}`}>
                          {f.ytdReturn >= 0 ? '+' : ''}{f.ytdReturn}% (2024)
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Monthly deduction + accumulation */}
            {profile.hasPension && profile.grossSalary > 0 && (
              <div className="bg-surface border border-line rounded-2xl p-4 space-y-2">
                <div className="text-xs font-bold text-ink mb-3">הפרשה חודשית מהמשכורת</div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">תגמולי עובד ({profile.pensionEmp}%)</span>
                  <span className="font-bold text-ink font-num">{fmtILS(profile.grossSalary * profile.pensionEmp / 100)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">תגמולי מעסיק ({profile.pensionEr}%)</span>
                  <span className="font-bold text-ink font-num">{fmtILS(profile.grossSalary * profile.pensionEr / 100)}</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-line">
                  <span className="text-ink font-bold">סה"כ חודשי</span>
                  <span className="font-bold text-[#9B59B6] font-num">{fmtILS(pensionMonthlyEst)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">הפקדה שנתית</span>
                  <span className="font-bold text-ink font-num">{fmtILS(pensionMonthlyEst * 12)}</span>
                </div>
              </div>
            )}
            {/* Accumulation history */}
            {investments.pensionValue > 0 && (() => {
              const snaps = (snapshots?.pensionValue || []).slice().sort((a, b) => a.date.localeCompare(b.date));
              const last = snaps[snaps.length - 1];
              const monthsCount = snaps.length;
              const firstDate = snaps[0]?.date;
              return (
                <div className="bg-gradient-to-br from-purple-50 to-card border border-purple-200/40 rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-bold text-[#9B59B6]">📈 הצטברות עד עכשיו</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-lg font-black text-ink font-num">{fmtILS(investments.pensionValue)}</div>
                      <div className="text-[10px] text-muted">יתרה כוללת</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-black text-[#9B59B6] font-num">{monthsCount}</div>
                      <div className="text-[10px] text-muted">חודשים</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-ink">{last?.date || '—'}</div>
                      <div className="text-[10px] text-muted">הפקדה אחרונה</div>
                    </div>
                  </div>
                  {firstDate && <div className="text-[10px] text-muted text-center">מאז {firstDate}</div>}
                  {snaps.length === 0 && <div className="text-[10px] text-[#9B59B6]/70 text-center pt-1">הגדר תאריך תחילת חיסכון ולחץ עדכן</div>}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── BANK SAVINGS ── */}
      {activeSubTab === 'savings' && (
        <div className="bg-card border border-line rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center gap-3">
            <button
              onClick={() => setShowAddSavings(!showAddSavings)}
              className="text-xs text-income font-bold hover:underline"
            >
              {showAddSavings ? 'סגור' : '+ הוסף חיסכון'}
            </button>
            <h3 className="min-w-0 truncate text-lg font-bold text-ink">חסכונות בנקאיים (פק"מ)</h3>
          </div>

          {showAddSavings && (
            <div className="bg-surface p-4 rounded-2xl border border-line space-y-3">
              <input
                type="text"
                value={savName}
                onChange={(e) => setSavName(e.target.value)}
                placeholder="שם החיסכון (כגון: פק''מ בריבית קבועה)"
                className="w-full bg-card border border-line rounded-xl px-3 py-2 text-ink text-xs outline-none"
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="number"
                  value={savVal}
                  onChange={(e) => setSavVal(e.target.value)}
                  placeholder="סכום ₪"
                  className="bg-card border border-line rounded-xl px-3 py-2 text-ink text-xs outline-none font-num"
                />
                <input
                  type="number"
                  step="0.1"
                  value={savRate}
                  onChange={(e) => setSavRate(e.target.value)}
                  placeholder="ריבית שנתית %"
                  className="bg-card border border-line rounded-xl px-3 py-2 text-ink text-xs outline-none font-num"
                />
              </div>
              <button
                onClick={handleAddSavings}
                className="w-full py-2 bg-primary text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                הוסף חיסכון ✓
              </button>
            </div>
          )}

          <div className="divide-y divide-line">
            {(investments.savings || []).length === 0 ? (
              <div className="text-center py-6 text-muted text-xs">אין חסכונות עדיין</div>
            ) : (
              (investments.savings || []).map((s) => (
                <div key={s.id} className="py-3 flex justify-between items-center gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-ink truncate">{s.name}</div>
                    <div className="text-muted truncate">{s.bank} · {s.rate}% ריבית</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-bold text-income font-num">{fmtILS(s.value)}</span>
                    <button
                      onClick={() => handleDeleteSavings(s.id)}
                      aria-label={`מחק חיסכון ${s.name}`}
                      className="text-muted hover:text-expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── MONEY MARKET ── */}
      {activeSubTab === 'mm' && (
        <div className="bg-card border border-line rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center gap-3">
            <button
              onClick={() => setShowAddMM(!showAddMM)}
              className="text-xs text-income font-bold hover:underline"
            >
              {showAddMM ? 'סגור' : '+ הוסף קרן'}
            </button>
            <h3 className="min-w-0 truncate text-lg font-bold text-ink">קרנות כספיות</h3>
          </div>

          {showAddMM && (
            <div className="bg-surface p-4 rounded-2xl border border-line space-y-3">
              <input
                type="text"
                value={mmName}
                onChange={(e) => setMmName(e.target.value)}
                placeholder="שם הקרן (כגון: מגדל שקלים כספית)"
                className="w-full bg-card border border-line rounded-xl px-3 py-2 text-ink text-xs outline-none"
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="number"
                  value={mmVal}
                  onChange={(e) => setMmVal(e.target.value)}
                  placeholder="סכום ₪"
                  className="bg-card border border-line rounded-xl px-3 py-2 text-ink text-xs outline-none font-num"
                />
                <input
                  type="number"
                  step="0.1"
                  value={mmYield}
                  onChange={(e) => setMmYield(e.target.value)}
                  placeholder="תשואה שנתית %"
                  className="bg-card border border-line rounded-xl px-3 py-2 text-ink text-xs outline-none font-num"
                />
              </div>
              <button
                onClick={handleAddMM}
                className="w-full py-2 bg-primary text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                הוסף קרן ✓
              </button>
            </div>
          )}

          <div className="divide-y divide-line">
            {(investments.moneyMarket || []).length === 0 ? (
              <div className="text-center py-6 text-muted text-xs">אין קרנות כספיות עדיין</div>
            ) : (
              (investments.moneyMarket || []).map((f) => (
                <div key={f.id} className="py-3 flex justify-between items-center gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-ink truncate">{f.name}</div>
                    <div className="text-muted">תשואה: {f.yield}% שנתי</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-bold text-income font-num">{fmtILS(f.value)}</span>
                    <button
                      onClick={() => handleDeleteMM(f.id)}
                      aria-label={`מחק קרן ${f.name}`}
                      className="text-muted hover:text-expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Buy Stock Modal */}
      {showBuyModal && (
        <ModalShell
          onClose={() => {
            setShowBuyModal(false);
            setQuoteMessage(null);
          }}
          ariaLabel="רכישת נייר ערך"
          maxWidthClass="sm:max-w-sm"
          panelClassName="space-y-4"
        >
            <h3 className="text-base font-bold text-ink flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0">רכישת נייר ערך (USD)</span>
              <span className="shrink-0 text-[10px] text-income bg-income/10 border border-income/20 px-2 py-0.5 rounded-full font-sans">
                מחובר ל-Live Quote API
              </span>
            </h3>

            {/* Symbol Input + Live Lookup */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted">סימול מניה / נייר ערך</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={buySymbol}
                  onChange={(e) => {
                    setBuySymbol(e.target.value);
                  }}
                  onBlur={() => {
                    if (buySymbol.trim().length >= 2) {
                      fetchQuoteForSymbol(buySymbol);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      fetchQuoteForSymbol(buySymbol);
                    }
                  }}
                  placeholder="סימול או שם מניה (NVDA, TSLA, טסלה, אנבידיה)"
                  className="w-full min-w-0 flex-1 bg-surface border border-line focus:border-primary rounded-xl px-3.5 py-2 text-ink text-sm outline-none font-num"
                />
                <button
                  type="button"
                  onClick={() => fetchQuoteForSymbol(buySymbol)}
                  disabled={isFetchingQuote || !buySymbol.trim()}
                  className="shrink-0 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingQuote ? 'animate-spin' : ''}`} />
                  <span>{isFetchingQuote ? 'טוען...' : 'משוך מחיר'}</span>
                </button>
              </div>
            </div>

            {/* Quick stock selector chips */}
            <div className="space-y-1">
              <span className="text-[10px] text-muted font-semibold block">בחירה מהירה מומלצת:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { sym: 'NVDA', name: 'אנבידיה' },
                  { sym: 'TSLA', name: 'טסלה' },
                  { sym: 'AAPL', name: 'אפל' },
                  { sym: 'MSFT', name: 'מיקרוסופט' },
                  { sym: 'AMZN', name: 'אמזון' },
                  { sym: 'SPY', name: 'S&P 500' },
                  { sym: 'QQQ', name: 'נאסדק' },
                  { sym: 'BTC', name: 'ביטקוין' },
                  { sym: 'ETH', name: 'אתריום' },
                ].map((item) => (
                  <button
                    key={item.sym}
                    type="button"
                    onClick={() => {
                      setBuySymbol(item.sym);
                      fetchQuoteForSymbol(item.sym);
                    }}
                    className="text-[10px] font-bold px-2 py-1 bg-surface hover:bg-card hover:border-primary/50 text-muted hover:text-ink rounded-lg border border-line transition-all cursor-pointer font-num flex items-center gap-1"
                  >
                    <span>+{item.sym}</span>
                    <span className="text-muted text-[9px]">({item.name})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Quote Feedback Banner */}
            {quoteMessage && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold leading-relaxed ${
                  quoteMessage.success
                    ? 'bg-income/10 border border-income/20 text-income'
                    : 'bg-[#FF9F43]/10 border border-[#FF9F43]/20 text-[#FF9F43]'
                }`}
              >
                {quoteMessage.text}
              </div>
            )}

            <input
              type="text"
              value={buyName}
              onChange={(e) => setBuyName(e.target.value)}
              placeholder="שם החברה (NVIDIA Corporation)"
              className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-ink text-sm outline-none"
            />

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[10px] text-muted font-semibold block">כמות מניות</label>
                <input
                  type="number"
                  step="0.001"
                  value={buyShares}
                  onChange={(e) => setBuyShares(e.target.value)}
                  placeholder="לדוגמה: 5"
                  className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-ink text-xs outline-none font-num"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted font-semibold block">מחיר למניה ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  placeholder="מחיר בשוק ($)"
                  className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-ink text-xs outline-none font-num"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
              <button
                onClick={() => {
                  setShowBuyModal(false);
                  setQuoteMessage(null);
                }}
                className="py-2.5 px-4 bg-surface text-ink border border-line font-bold text-xs rounded-xl cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={handleBuyStock}
                className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all"
              >
                אשר רכישה ✓
              </button>
            </div>
        </ModalShell>
      )}

      {/* Deposit Cash Modal */}
      {showDepositModal && (
        <ModalShell
          onClose={() => setShowDepositModal(false)}
          ariaLabel="הפקדת מזומן פנוי"
          maxWidthClass="sm:max-w-sm"
          panelClassName="space-y-4"
        >
            <h3 className="text-base font-bold text-ink">הפקדת מזומן פנוי ($)</h3>

            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="סכום בדולרים ($)"
              className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-ink text-sm outline-none font-num"
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDepositModal(false)}
                className="py-2.5 px-4 bg-surface text-ink border border-line font-bold text-xs rounded-xl cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={handleDepositCash}
                className="flex-1 py-2.5 px-4 bg-primary text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                הפקד ✓
              </button>
            </div>
        </ModalShell>
      )}

      {/* Sell Stock Modal */}
      {showSellModal && selectedHoldingForSell && (
        <ModalShell
          onClose={() => {
            setShowSellModal(false);
            setSelectedHoldingForSell(null);
          }}
          ariaLabel="מכירת נייר ערך"
          maxWidthClass="sm:max-w-sm"
          panelClassName="space-y-4"
        >
            <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-bold text-ink flex min-w-0 items-center gap-2">
                <span>מכירת נייר ערך</span>
                <span className="text-xs text-expense bg-expense/10 border border-expense/20 px-2 py-0.5 rounded-full font-num">
                  {selectedHoldingForSell.symbol}
                </span>
              </h3>
              <span className="text-xs text-muted font-num shrink-0">
                זמין למכירה: {selectedHoldingForSell.shares} יח׳
              </span>
            </div>

            <div className="bg-surface p-3 rounded-2xl border border-line space-y-1">
              <div className="text-[11px] text-muted">מחיר שוק מעודכן בלייב</div>
              <div className="text-sm font-black text-income font-num flex flex-wrap justify-between items-center gap-2">
                <span>${(selectedHoldingForSell.currentPrice || selectedHoldingForSell.avgCost || 0).toFixed(2)} למניה</span>
                <button
                  type="button"
                  onClick={() => setSellShares(String(selectedHoldingForSell.shares))}
                  className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-bold px-2 py-1 rounded-lg transition-all cursor-pointer"
                >
                  מכור הכל ({selectedHoldingForSell.shares})
                </button>
              </div>
            </div>

            {/* Inline sell error */}
            {sellError && (
              <div className="p-2.5 rounded-xl text-xs font-bold leading-relaxed bg-expense/10 border border-expense/20 text-expense">
                {sellError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[10px] text-muted font-semibold block">כמות מניות למכירה</label>
                <input
                  type="number"
                  step="0.001"
                  max={selectedHoldingForSell.shares}
                  value={sellShares}
                  onChange={(e) => setSellShares(e.target.value)}
                  placeholder="כמות"
                  className="w-full bg-surface border border-line focus:border-expense rounded-xl px-3 py-2 text-ink text-xs outline-none font-num"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted font-semibold block">מחיר למניה ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="מחיר"
                  className="w-full bg-surface border border-line focus:border-expense rounded-xl px-3 py-2 text-ink text-xs outline-none font-num"
                />
              </div>
            </div>

            {/* Estimated Proceeds Calculation */}
            {parseFloat(sellShares) > 0 && parseFloat(sellPrice) > 0 && (
              <div className="bg-expense/10 border border-expense/20 p-3 rounded-2xl text-xs flex flex-wrap justify-between items-center gap-2">
                <span className="text-expense font-medium">תקבול ממכירה למזומן:</span>
                <div className="text-right">
                  <div className="font-black text-expense font-num text-sm">
                    {fmtUSD(parseFloat(sellShares) * parseFloat(sellPrice))}
                  </div>
                  <div className="text-[10px] text-muted font-num">
                    {fmtILS(parseFloat(sellShares) * parseFloat(sellPrice) * usdRate)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setShowSellModal(false);
                  setSelectedHoldingForSell(null);
                }}
                className="py-2.5 px-4 bg-surface text-ink border border-line font-bold text-xs rounded-xl cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleSellStock}
                className="flex-1 py-2.5 px-4 bg-expense hover:bg-expense/90 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all"
              >
                אשר מכירה ✓
              </button>
            </div>
        </ModalShell>
      )}
    </div>
  );
};
