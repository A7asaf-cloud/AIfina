/**
 * FinanceIL - Application Types
 */

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  email?: string;
  createdAt: string;
  profile: UserProfile;
}

export interface UserProfile {
  name: string;
  netSalary: number;
  grossSalary: number;
  salaryDay: number; // e.g. 10
  creditDay: number; // e.g. 1
  bankBalance: number;
  creditDebt: number;
  rent: number;
  rentDay: number;
  hasKeren: boolean;
  kerenEmp: number; // employee % e.g. 2.5
  kerenEr: number;  // employer % e.g. 7.5
  hasPension: boolean;
  pensionEmp: number; // employee % e.g. 6.0
  pensionEr: number;  // employer % e.g. 14.83
  createdAt: string;
}

export interface Transaction {
  id: string | number;
  description: string;
  amount: number; // positive = income, negative = expense
  date: string; // YYYY-MM-DD
  cat: string;
  color: string;
  emoji: string;
  account?: string;
  auto?: boolean;
  notes?: string;
}

export interface CategoryRule {
  kw: string[];
  cat: string;
  color: string;
  emoji: string;
}

export interface BudgetPlanItem {
  key: string;
  pct: number;
  color: string;
  emoji: string;
  amount?: number;
}

export interface StockHolding {
  id: string | number;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number; // USD
  color: string;
  currentPrice?: number;
  changePercent?: number;
}

export interface StockHistoryItem {
  id: string | number;
  type: 'buy' | 'sell' | 'deposit';
  symbol?: string;
  shares?: number;
  price?: number;
  cost?: number;
  proceeds?: number;
  pl?: number;
  amount?: number;
  date: string;
}

export interface SavingsAccount {
  id: string | number;
  name: string;
  bank: string;
  value: number;
  rate: number; // annual %
}

export interface MoneyMarketFund {
  id: string | number;
  name: string;
  value: number;
  yield: number; // annual %
}

export interface InvestmentState {
  kerenValue: number;
  kerenYTD?: number;
  pensionValue: number;
  pensionYTD?: number;
  savings: SavingsAccount[];
  moneyMarket: MoneyMarketFund[];
  portfolioHoldings: StockHolding[];
  portfolioCash: number;
  portfolioHistory: StockHistoryItem[];
}

export interface SnapshotItem {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface UserAppData {
  profile: UserProfile;
  transactions: Transaction[];
  budgetPlan: BudgetPlanItem[];
  investments: InvestmentState;
  snapshots: Record<string, SnapshotItem[]>;
}

