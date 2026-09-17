import { InvestmentState, StockHolding } from '../types';

export type PortfolioCurrency = 'ILS' | 'USD';

const balance = (investments: InvestmentState, currency: PortfolioCurrency) =>
  investments.portfolioCashByCurrency?.[currency] ?? (currency === 'USD' ? investments.portfolioCash || 0 : 0);

const cashUpdate = (investments: InvestmentState, currency: PortfolioCurrency, value: number): Partial<InvestmentState> => ({
  portfolioCashByCurrency: { ...(investments.portfolioCashByCurrency || {}), [currency]: value },
  ...(currency === 'USD' ? { portfolioCash: value } : {}),
});

export const depositPortfolioCash = (investments: InvestmentState, amount: number, currency: PortfolioCurrency): Partial<InvestmentState> =>
  cashUpdate(investments, currency, balance(investments, currency) + amount);

export const buyPortfolioHolding = (
  investments: InvestmentState,
  input: { symbol: string; name?: string; shares: number; price: number; currency: PortfolioCurrency },
): { update?: Partial<InvestmentState>; error?: string } => {
  const cost = input.shares * input.price;
  const available = balance(investments, input.currency);
  if (!Number.isFinite(cost) || cost <= 0 || cost > available + 0.01) return { error: 'אין מספיק מזומן פנוי במטבע הזה כדי לבצע את הקנייה.' };
  const holdings = investments.portfolioHoldings || [];
  const normalizedSymbol = input.symbol.trim().toUpperCase();
  const existing = holdings.find(item => item.symbol === normalizedSymbol && (item.currency || 'USD') === input.currency);
  const updatedHoldings: StockHolding[] = existing
    ? holdings.map(item => item.id === existing.id ? {
      ...item, shares: item.shares + input.shares,
      avgCost: ((item.shares * item.avgCost) + cost) / (item.shares + input.shares),
      currentPrice: input.price,
    } : item)
    : [...holdings, {
      id: 'assistant-buy-' + Date.now(), symbol: normalizedSymbol, name: input.name || normalizedSymbol,
      shares: input.shares, avgCost: input.price, currentPrice: input.price, currency: input.currency, color: '#6366F1',
    }];
  return {
    update: {
      portfolioHoldings: updatedHoldings,
      ...cashUpdate(investments, input.currency, available - cost),
      portfolioHistory: [{ id: 'assistant-buy-' + Date.now(), type: 'buy', symbol: normalizedSymbol, shares: input.shares, price: input.price, cost, date: new Date().toISOString().slice(0, 10) }, ...(investments.portfolioHistory || [])],
    },
  };
};
