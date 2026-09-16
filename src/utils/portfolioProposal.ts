import { StockHolding } from '../types';

export type PortfolioProposal = {
  cash?: unknown;
  holdings?: Array<Partial<StockHolding> & Record<string, unknown>>;
};

export type PortfolioUpdate = {
  holdings: Array<Partial<StockHolding>>;
  cash?: number;
};

const cashLabel = (value: unknown) => /^(?:cash|cash balance|available cash|מזומן|יתרת מזומן)$/i.test(String(value || '').trim());

export const moneyNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().replace(/[₪$,\s]/g, '').replace(/[^\d.-]/g, '');
  if (!normalized || normalized === '-' || normalized === '.') return undefined;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
};

/**
 * Gemini can return cash either in the dedicated field or as a pseudo holding.
 * This turns both shapes into a single separate cash balance before the UI saves it.
 */
export const normalizePortfolioProposal = (proposal: PortfolioProposal): PortfolioUpdate => {
  let cash = moneyNumber(proposal.cash);
  const holdings: Array<Partial<StockHolding>> = [];

  (proposal.holdings || []).forEach((item) => {
    const isCash = cashLabel(item.symbol) || cashLabel(item.name);
    if (isCash) {
      if (cash === undefined) {
        const inferred = moneyNumber(item.value) ?? moneyNumber(item.currentPrice) ?? moneyNumber(item.avgCost);
        if (inferred !== undefined) cash = inferred;
      }
      return;
    }
    holdings.push(item);
  });

  return { holdings, ...(cash !== undefined && cash >= 0 ? { cash } : {}) };
};
