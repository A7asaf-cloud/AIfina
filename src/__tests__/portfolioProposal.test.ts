import { describe, expect, it } from 'vitest';
import { normalizePortfolioProposal } from '../utils/portfolioProposal';

describe('portfolio proposal normalization', () => {
  it('keeps explicit cash separate from stock holdings', () => {
    const result = normalizePortfolioProposal({ cash: '₪ 2,450.50', holdings: [{ symbol: 'AAPL', shares: 3 }] });
    expect(result.cash).toBe(2450.5);
    expect(result.holdings).toEqual([{ symbol: 'AAPL', shares: 3 }]);
  });

  it('retains the cash currency supplied by the model', () => {
    const result = normalizePortfolioProposal({ cash: '51,206.73', cashCurrency: 'ILS' });
    expect(result).toMatchObject({ cash: 51206.73, cashCurrency: 'ILS' });
  });

  it('moves a Cash pseudo-holding into the separate cash balance', () => {
    const result = normalizePortfolioProposal({ holdings: [{ symbol: 'CASH', name: 'Available cash', shares: 1, currentPrice: 890 }, { symbol: 'MSFT', shares: 2 }] });
    expect(result.cash).toBe(890);
    expect(result.holdings).toEqual([{ symbol: 'MSFT', shares: 2 }]);
  });

  it('does not overwrite existing cash when the image did not provide a cash balance', () => {
    const result = normalizePortfolioProposal({ holdings: [{ symbol: 'NVDA', shares: 1 }] });
    expect(result).not.toHaveProperty('cash');
  });
});
