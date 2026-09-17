import { describe, expect, it } from 'vitest';
import { buyPortfolioHolding, depositPortfolioCash } from '../utils/portfolioActions';
import { InvestmentState } from '../types';

const state = (): InvestmentState => ({ kerenValue: 0, pensionValue: 0, savings: [], moneyMarket: [], portfolioHoldings: [], portfolioCash: 1000, portfolioCashByCurrency: { USD: 1000, ILS: 500 }, portfolioHistory: [] });

describe('portfolio actions', () => {
  it('deposits cash into the selected currency balance', () => {
    expect(depositPortfolioCash(state(), 250, 'ILS').portfolioCashByCurrency).toMatchObject({ ILS: 750, USD: 1000 });
  });
  it('adds a purchased holding and deducts its cost from matching cash', () => {
    const result = buyPortfolioHolding(state(), { symbol: 'AAPL', shares: 2, price: 150, currency: 'USD' });
    expect(result.update?.portfolioCashByCurrency).toMatchObject({ USD: 700 });
    expect(result.update?.portfolioHoldings?.[0]).toMatchObject({ symbol: 'AAPL', shares: 2, avgCost: 150 });
  });
  it('refuses purchases larger than available cash', () => {
    expect(buyPortfolioHolding(state(), { symbol: 'AAPL', shares: 10, price: 150, currency: 'USD' }).error).toContain('אין מספיק מזומן');
  });
});
