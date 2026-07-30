import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  InvestmentState,
  StockHolding,
  SavingsAccount,
  MoneyMarketFund,
  StockHistoryItem,
} from '../types';
import { fmtILS, fmtUSD, fmtDate } from '../utils/formatters';
import { fetchStockQuoteClientSide } from '../utils/apiFallback';
import {
  TrendingUp,
  Briefcase,
  Building2,
  DollarSign,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  RefreshCw,
  Wallet,
} from 'lucide-react';

interface InvestmentsTabProps {
  profile: UserProfile;
  investments: InvestmentState;
  onUpdateInvestments: (data: Partial<InvestmentState>) => void;
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
    <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-start">
        <button onClick={onClear} className="text-xs text-slate-500 hover:text-slate-300 transition">✕ שנה קרן</button>
        <div className="text-right">
          <div className="text-sm font-bold text-white">{fund.name}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{fund.company} · {fund.track}</div>
          {fund.source === 'static' && (
            <div className="text-[10px] text-amber-400 mt-0.5">* נתוני 2024 — מקור: דוחות ציבוריים</div>
          )}
        </div>
      </div>

      {/* Returns summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-900 rounded-xl p-2.5 text-center">
          <div className="text-[10px] text-slate-500">תשואה 2024</div>
          <div className={`text-sm font-black font-num ${fund.ytdReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fund.ytdReturn >= 0 ? '+' : ''}{fund.ytdReturn}%
          </div>
        </div>
        <div className="bg-slate-900 rounded-xl p-2.5 text-center">
          <div className="text-[10px] text-slate-500">ממוצע 3 שנים</div>
          <div className="text-sm font-black font-num text-blue-400">+{fund.threeYearAvg}%</div>
        </div>
        <div className="bg-slate-900 rounded-xl p-2.5 text-center">
          <div className="text-[10px] text-slate-500">ממוצע 5 שנים</div>
          <div className="text-sm font-black font-num text-indigo-400">+{fund.fiveYearAvg}%</div>
        </div>
      </div>

      {/* P&L calculation */}
      {balance > 0 && (
        <div className={`rounded-xl p-3 border ${gain >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">יתרה נוכחית</span>
            <span className="font-bold text-white font-num">{fmtILS(balance)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold mt-1">
            <span className={gain >= 0 ? 'text-emerald-400' : 'text-red-400'}>רווח/הפסד 2024</span>
            <span className={`font-num ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {gain >= 0 ? '+' : ''}{fmtILS(gain)}
            </span>
          </div>
        </div>
      )}

      {/* Monthly returns bar chart */}
      {last6.length > 0 && (
        <div>
          <div className="text-[10px] text-slate-500 mb-2">תשואות חודשיות (6 חודשים אחרונים)</div>
          <div className="flex items-end gap-1.5 h-10">
            {last6.map((m) => {
              const monthKey = m.month.split('-')[1];
              const isPos = m.returnPct >= 0;
              const height = Math.min(100, Math.abs(m.returnPct) * 8);
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="text-[9px] font-num text-slate-400">{m.returnPct > 0 ? '+' : ''}{m.returnPct.toFixed(1)}%</div>
                  <div className="w-full flex items-end justify-center" style={{ height: '24px' }}>
                    <div
                      className={`w-full rounded-sm ${isPos ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ height: `${Math.max(2, height)}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-600">{MONTH_HE[monthKey] || monthKey}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export const InvestmentsTab: React.FC<InvestmentsTabProps> = ({
  profile,
  investments,
  onUpdateInvestments,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'returns' | 'stocks' | 'keren' | 'pension' | 'savings' | 'mm'
  >('stocks');

  const [usdRate, setUsdRate] = useState<number>(3.72); // Standard USD/ILS conversion rate
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

  // Fetch market summary indices & live Forex on mount
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

  // Auto-refresh stock prices on mount and every 30 seconds when stocks subtab is active
  useEffect(() => {
    if (activeSubTab === 'stocks' && investments.portfolioHoldings && investments.portfolioHoldings.length > 0) {
      handleRefreshStockPrices();
      const interval = setInterval(() => {
        handleRefreshStockPrices();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [activeSubTab, investments.portfolioHoldings?.length]);

  // Refresh live stock prices from Yahoo Finance API
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
              // Direct client-side quote fetch fallback if server is unreachable
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

  // Stock Buy / Sell Form State
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
        // Direct client fallback if server is unreachable
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

  const openSellModal = (h: StockHolding) => {
    setSelectedHoldingForSell(h);
    setSellShares(String(h.shares));
    setSellPrice(String(h.currentPrice || h.avgCost || 0));
    setShowSellModal(true);
  };

  const handleSellStock = () => {
    if (!selectedHoldingForSell) return;
    const sharesToSell = parseFloat(sellShares);
    const pricePerShare = parseFloat(sellPrice);

    if (isNaN(sharesToSell) || sharesToSell <= 0 || sharesToSell > selectedHoldingForSell.shares) {
      alert(`כמות מניות למכירה אינה תקינה. תוכל למכור עד ${selectedHoldingForSell.shares} מניות.`);
      return;
    }
    if (isNaN(pricePerShare) || pricePerShare <= 0) {
      alert('מחיר למניה אינו תקין.');
      return;
    }

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
    if (confirm(`האם להסיר את המניה ${symbol} מהתיק?`)) {
      onUpdateInvestments({
        portfolioHoldings: holdings.filter((h) => h.id !== id),
      });
    }
  };

  const [depositAmount, setDepositAmount] = useState('');

  interface FundResult {
    id: string; name: string; company: string; type: string; track: string;
    ytdReturn: number; threeYearAvg: number; fiveYearAvg: number;
    monthlyReturns: { month: string; returnPct: number }[];
    source: 'live' | 'static';
  }

  // Editable fund inputs
  const [kerenInput, setKerenInput] = useState(
    investments.kerenValue ? String(investments.kerenValue) : ''
  );
  const [pensionInput, setPensionInput] = useState(
    investments.pensionValue ? String(investments.pensionValue) : ''
  );
  const [kerenTrack, setKerenTrack] = useState(investments.kerenTrack || '');
  const [pensionTrack, setPensionTrack] = useState(investments.pensionTrack || '');

  // Fund search state
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

  // Load initial fund lists on mount
  useEffect(() => {
    searchFunds('', 'keren', setKerenFunds, setKerenSearching);
    searchFunds('', 'pension', setPensionFunds, setPensionSearching);
  }, []);

  // New savings account state
  const [showAddSavings, setShowAddSavings] = useState(false);
  const [savName, setSavName] = useState('');
  const [savBank, setSavBank] = useState('');
  const [savVal, setSavVal] = useState('');
  const [savRate, setSavRate] = useState('');

  // New money market fund state
  const [showAddMM, setShowAddMM] = useState(false);
  const [mmName, setMmName] = useState('');
  const [mmVal, setMmVal] = useState('');
  const [mmYield, setMmYield] = useState('');

  // Calculations
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

  // Monthly deposit estimates from employer
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
          color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
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
    }
  };

  const handleSavePension = () => {
    const v = parseFloat(pensionInput);
    if (!isNaN(v) && v >= 0) {
      onUpdateInvestments({ pensionValue: v, pensionTrack: pensionTrack || undefined });
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
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-inner space-y-1.5">
          <div className="flex justify-between items-center text-[11px] text-slate-400 font-semibold px-1">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              מדדי שוק, מט״ח וקריפטו בלייב (API)
            </span>
            <span className="text-[10px] text-slate-500">לחץ לציטוט מהיר</span>
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
                  className="flex-shrink-0 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl transition-all text-right cursor-pointer group"
                >
                  <div className="text-[11px] font-extrabold text-white group-hover:text-emerald-400 flex items-center gap-1">
                    <span>{m.name}</span>
                    <span className="text-[9px] px-1 bg-slate-800 rounded text-slate-400 font-num">
                      {m.symbol}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-black font-num text-slate-200">
                      {m.currency === 'ILS' ? `₪${m.price}` : `$${m.price}`}
                    </span>
                    <span
                      className={`text-[10px] font-bold font-num ${
                        isPos ? 'text-emerald-400' : 'text-red-400'
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

      {/* Navigation Sub-Tabs — scrollable, each button fixed size */}
      <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide gap-1">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`shrink-0 py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === t.id
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
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
          <div className="bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
            {/* Value + action buttons — wrap on narrow screens */}
            <div className="flex flex-wrap justify-between items-start gap-3">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-400">📊 תיק מניות</span>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-num mt-1 break-all">
                  {fmtUSD(totalPortUSD)}
                </h2>
                <div className="text-[11px] text-slate-400 font-num mt-0.5">
                  {fmtILS(totalPortILS)} · ₪{usdRate.toFixed(2)}/$
                  {lastRefreshedTime && (
                    <span className="text-emerald-400 font-semibold mr-1">🟢 {lastRefreshedTime}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button onClick={handleRefreshStockPrices} disabled={isRefreshing}
                  className="px-2.5 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-xs font-bold rounded-xl border border-indigo-500/30 flex items-center gap-1 cursor-pointer disabled:opacity-50">
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? '...' : 'רענן'}</span>
                </button>
                <button onClick={() => setShowDepositModal(true)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer">
                  💵 הפקד
                </button>
                <button onClick={() => setShowBuyModal(true)}
                  className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl shadow-md cursor-pointer">
                  🟢 קנה
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800/80 text-xs">
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">עלות</div>
                <div className="font-bold text-white font-num mt-0.5 text-[11px] break-all">{fmtUSD(totalStockCostBasisUSD)}</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">שווי</div>
                <div className="font-bold text-emerald-400 font-num mt-0.5 text-[11px] break-all">{fmtUSD(totalStockValUSD)}</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">מזומן</div>
                <div className="font-bold text-white font-num mt-0.5 text-[11px] break-all">{fmtUSD(cashUSD)}</div>
              </div>
            </div>
          </div>

          {/* Holdings Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-white text-sm">החזקות קיימות בתיק</h3>

            {holdings.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
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
                    <div key={h.id} className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 space-y-3">
                      {/* Row 1: symbol + value */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-xs flex-shrink-0"
                               style={{ backgroundColor: h.color + '20', color: h.color }}>
                            {h.symbol.slice(0, 4)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{h.symbol}</div>
                            <div className="text-xs text-slate-400 mt-0.5 leading-snug max-w-[160px]">{h.name}</div>
                          </div>
                        </div>
                        <div className="text-left flex-shrink-0">
                          <div className="text-base font-bold text-white font-num">{fmtUSD(valUSD)}</div>
                          <div className={`text-xs font-bold font-num mt-0.5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{fmtUSD(gainUSD)} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%)
                          </div>
                        </div>
                      </div>

                      {/* Row 2: details + actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[11px] text-slate-500 leading-relaxed min-w-0 break-words">
                          <span>{h.shares} יח׳ · ${livePrice.toFixed(2)} · ממוצע ${h.avgCost.toFixed(2)}</span>
                          {h.changePercent !== undefined && (
                            <span className={`mr-1 font-bold ${h.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              · {h.changePercent >= 0 ? '+' : ''}{h.changePercent.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => openSellModal(h)}
                            className="px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-lg transition-all cursor-pointer">
                            מכור
                          </button>
                          <button onClick={() => handleDeleteStockHolding(h.id, h.symbol)}
                            className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer">
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
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-2xl font-bold">
              📈
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">קרן השתלמות</h3>
              <p className="text-xs text-slate-400">מעקב שווי פטור ממס</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {/* Current value */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">שווי נוכחי בקרן (₪)</label>
              <div className="flex gap-2">
                <input type="number" value={kerenInput} onChange={(e) => setKerenInput(e.target.value)}
                  placeholder="85000"
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none font-num" />
                <button onClick={handleSaveKeren}
                  className="px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl cursor-pointer">
                  עדכן
                </button>
              </div>
            </div>

            {/* Fund search */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">חפש קרן השתלמות</label>
              <input type="text" value={kerenSearch} onChange={e => setKerenSearch(e.target.value)}
                placeholder="הראל, מנורה, אינפיניטי, כלל..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none mb-2" />

              {kerenSelected ? (
                <FundCard fund={kerenSelected} balance={parseFloat(kerenInput) || investments.kerenValue || 0}
                  onClear={() => setKerenSelected(null)} />
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {kerenSearching && <div className="text-xs text-slate-500 text-center py-2">מחפש...</div>}
                  {kerenFunds.map(f => (
                    <button key={f.id} onClick={() => setKerenSelected(f)}
                      className="w-full text-right bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 rounded-xl px-3 py-2.5 transition-all cursor-pointer">
                      <div className="text-xs font-bold text-white">{f.name}</div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[11px] text-slate-500">{f.company} · {f.track}</span>
                        <span className={`text-[11px] font-bold font-num ${f.ytdReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {f.ytdReturn >= 0 ? '+' : ''}{f.ytdReturn}% (2024)
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Monthly deduction breakdown */}
            {profile.hasKeren && profile.grossSalary > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-bold text-slate-300 mb-3">הפרשה חודשית מהמשכורת</div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">עובד ({profile.kerenEmp}%)</span>
                  <span className="font-bold text-white font-num">{fmtILS(profile.grossSalary * profile.kerenEmp / 100)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">מעסיק ({profile.kerenEr}%)</span>
                  <span className="font-bold text-white font-num">{fmtILS(profile.grossSalary * profile.kerenEr / 100)}</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-slate-800">
                  <span className="text-slate-300 font-bold">סה"כ חודשי</span>
                  <span className="font-bold text-emerald-400 font-num">{fmtILS(kerenMonthlyEst)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PENSION ── */}
      {activeSubTab === 'pension' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-2xl font-bold">
              🏛️
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">קרן פנסיה</h3>
              <p className="text-xs text-slate-400">חיסכון ארוך טווח לגיל פרישה</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {/* Current value */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">שווי נוכחי בפנסיה (₪)</label>
              <div className="flex gap-2">
                <input type="number" value={pensionInput} onChange={(e) => setPensionInput(e.target.value)}
                  placeholder="240000"
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none font-num" />
                <button onClick={handleSavePension}
                  className="px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl cursor-pointer">
                  עדכן
                </button>
              </div>
            </div>

            {/* Fund search */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">חפש קרן פנסיה</label>
              <input type="text" value={pensionSearch} onChange={e => setPensionSearch(e.target.value)}
                placeholder="הראל, מנורה, אינפיניטי, כלל, מגדל..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-3 text-white text-sm outline-none mb-2" />

              {pensionSelected ? (
                <FundCard fund={pensionSelected} balance={parseFloat(pensionInput) || investments.pensionValue || 0}
                  onClear={() => setPensionSelected(null)} />
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {pensionSearching && <div className="text-xs text-slate-500 text-center py-2">מחפש...</div>}
                  {pensionFunds.map(f => (
                    <button key={f.id} onClick={() => setPensionSelected(f)}
                      className="w-full text-right bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 rounded-xl px-3 py-2.5 transition-all cursor-pointer">
                      <div className="text-xs font-bold text-white">{f.name}</div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[11px] text-slate-500">{f.company} · {f.track}</span>
                        <span className={`text-[11px] font-bold font-num ${f.ytdReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {f.ytdReturn >= 0 ? '+' : ''}{f.ytdReturn}% (2024)
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Monthly deduction breakdown */}
            {profile.hasPension && profile.grossSalary > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-bold text-slate-300 mb-3">הפרשה חודשית מהמשכורת</div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">תגמולי עובד ({profile.pensionEmp}%)</span>
                  <span className="font-bold text-white font-num">{fmtILS(profile.grossSalary * profile.pensionEmp / 100)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">תגמולי מעסיק ({profile.pensionEr}%)</span>
                  <span className="font-bold text-white font-num">{fmtILS(profile.grossSalary * profile.pensionEr / 100)}</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-slate-800">
                  <span className="text-slate-300 font-bold">סה"כ חודשי</span>
                  <span className="font-bold text-purple-400 font-num">{fmtILS(pensionMonthlyEst)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">הפקדה שנתית</span>
                  <span className="font-bold text-slate-300 font-num">{fmtILS(pensionMonthlyEst * 12)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BANK SAVINGS ── */}
      {activeSubTab === 'savings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setShowAddSavings(!showAddSavings)}
              className="text-xs text-emerald-400 font-bold hover:underline"
            >
              {showAddSavings ? 'סגור' : '+ הוסף חיסכון'}
            </button>
            <h3 className="text-lg font-bold text-white">חסכונות בנקאיים (פק"מ)</h3>
          </div>

          {showAddSavings && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <input
                type="text"
                value={savName}
                onChange={(e) => setSavName(e.target.value)}
                placeholder="שם החיסכון (כגון: פק''מ בריבית קבועה)"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={savVal}
                  onChange={(e) => setSavVal(e.target.value)}
                  placeholder="סכום ₪"
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none font-num"
                />
                <input
                  type="number"
                  step="0.1"
                  value={savRate}
                  onChange={(e) => setSavRate(e.target.value)}
                  placeholder="ריבית שנתית %"
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none font-num"
                />
              </div>
              <button
                onClick={handleAddSavings}
                className="w-full py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
              >
                הוסף חיסכון ✓
              </button>
            </div>
          )}

          <div className="divide-y divide-slate-800">
            {(investments.savings || []).length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">אין חסכונות עדיין</div>
            ) : (
              (investments.savings || []).map((s) => (
                <div key={s.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-white">{s.name}</div>
                    <div className="text-slate-500">{s.bank} · {s.rate}% ריבית</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-400 font-num">{fmtILS(s.value)}</span>
                    <button
                      onClick={() => handleDeleteSavings(s.id)}
                      className="text-slate-500 hover:text-red-400"
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
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setShowAddMM(!showAddMM)}
              className="text-xs text-emerald-400 font-bold hover:underline"
            >
              {showAddMM ? 'סגור' : '+ הוסף קרן'}
            </button>
            <h3 className="text-lg font-bold text-white">קרנות כספיות</h3>
          </div>

          {showAddMM && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <input
                type="text"
                value={mmName}
                onChange={(e) => setMmName(e.target.value)}
                placeholder="שם הקרן (כגון: מגדל שקלים כספית)"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={mmVal}
                  onChange={(e) => setMmVal(e.target.value)}
                  placeholder="סכום ₪"
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none font-num"
                />
                <input
                  type="number"
                  step="0.1"
                  value={mmYield}
                  onChange={(e) => setMmYield(e.target.value)}
                  placeholder="תשואה שנתית %"
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none font-num"
                />
              </div>
              <button
                onClick={handleAddMM}
                className="w-full py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
              >
                הוסף קרן ✓
              </button>
            </div>
          )}

          <div className="divide-y divide-slate-800">
            {(investments.moneyMarket || []).length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">אין קרנות כספיות עדיין</div>
            ) : (
              (investments.moneyMarket || []).map((f) => (
                <div key={f.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-white">{f.name}</div>
                    <div className="text-slate-500">תשואה: {f.yield}% שנתי</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-400 font-num">{fmtILS(f.value)}</span>
                    <button
                      onClick={() => handleDeleteMM(f.id)}
                      className="text-slate-500 hover:text-red-400"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex justify-between items-center">
              <span>רכישת נייר ערך (USD)</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-sans">
                מחובר ל-Live Quote API
              </span>
            </h3>

            {/* Symbol Input + Live Lookup */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">סימול מניה / נייר ערך</label>
              <div className="flex gap-2">
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
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-white text-sm outline-none font-num"
                />
                <button
                  type="button"
                  onClick={() => fetchQuoteForSymbol(buySymbol)}
                  disabled={isFetchingQuote || !buySymbol.trim()}
                  className="px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingQuote ? 'animate-spin' : ''}`} />
                  <span>{isFetchingQuote ? 'טוען...' : 'משוך מחיר'}</span>
                </button>
              </div>
            </div>

            {/* Quick stock selector chips */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold block">בחירה מהירה מומלצת:</span>
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
                    className="text-[10px] font-bold px-2 py-1 bg-slate-800 hover:bg-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-white rounded-lg border border-slate-700/80 transition-all cursor-pointer font-num flex items-center gap-1"
                  >
                    <span>+{item.sym}</span>
                    <span className="text-slate-500 text-[9px]">({item.name})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Quote Feedback Banner */}
            {quoteMessage && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold leading-relaxed ${
                  quoteMessage.success
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
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
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
            />

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold block">כמות מניות</label>
                <input
                  type="number"
                  step="0.001"
                  value={buyShares}
                  onChange={(e) => setBuyShares(e.target.value)}
                  placeholder="לדוגמה: 5"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none font-num"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold block">מחיר למניה ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  placeholder="מחיר בשוק ($)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none font-num"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowBuyModal(false);
                  setQuoteMessage(null);
                }}
                className="py-2.5 px-4 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={handleBuyStock}
                className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all"
              >
                אשר רכישה ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Cash Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">הפקדת מזומן פנוי ($)</h3>

            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="סכום בדולרים ($)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none font-num"
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDepositModal(false)}
                className="py-2.5 px-4 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={handleDepositCash}
                className="flex-1 py-2.5 px-4 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
              >
                הפקד ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Stock Modal */}
      {showSellModal && selectedHoldingForSell && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>מכירת נייר ערך</span>
                <span className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full font-num">
                  {selectedHoldingForSell.symbol}
                </span>
              </h3>
              <span className="text-xs text-slate-400 font-num">
                זמין למכירה: {selectedHoldingForSell.shares} יח׳
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1">
              <div className="text-[11px] text-slate-400">מחיר שוק מעודכן בלייב</div>
              <div className="text-sm font-black text-emerald-400 font-num flex justify-between items-center">
                <span>${(selectedHoldingForSell.currentPrice || selectedHoldingForSell.avgCost || 0).toFixed(2)} למניה</span>
                <button
                  type="button"
                  onClick={() => setSellShares(String(selectedHoldingForSell.shares))}
                  className="text-[10px] bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-bold px-2 py-1 rounded-lg transition-all cursor-pointer"
                >
                  מכור הכל ({selectedHoldingForSell.shares})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold block">כמות מניות למכירה</label>
                <input
                  type="number"
                  step="0.001"
                  max={selectedHoldingForSell.shares}
                  value={sellShares}
                  onChange={(e) => setSellShares(e.target.value)}
                  placeholder="כמות"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2 text-white text-xs outline-none font-num"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold block">מחיר למניה ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="מחיר"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2 text-white text-xs outline-none font-num"
                />
              </div>
            </div>

            {/* Estimated Proceeds Calculation */}
            {parseFloat(sellShares) > 0 && parseFloat(sellPrice) > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl text-xs flex justify-between items-center">
                <span className="text-rose-200 font-medium">תקבול ממכירה למזומן:</span>
                <div className="text-right">
                  <div className="font-black text-rose-300 font-num text-sm">
                    {fmtUSD(parseFloat(sellShares) * parseFloat(sellPrice))}
                  </div>
                  <div className="text-[10px] text-slate-400 font-num">
                    {fmtILS(parseFloat(sellShares) * parseFloat(sellPrice) * usdRate)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSellModal(false);
                  setSelectedHoldingForSell(null);
                }}
                className="py-2.5 px-4 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleSellStock}
                className="flex-1 py-2.5 px-4 bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all"
              >
                אשר מכירה וקבל מזומן ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
