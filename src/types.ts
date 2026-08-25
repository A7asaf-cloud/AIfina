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
  salaryDay: number;
  creditDay: number;
  bankBalance: number;
  creditDebt: number;
  rent: number;
  rentDay: number;
  hasKeren: boolean;
  kerenEmp: number;
  kerenEr: number;
  hasPension: boolean;
  pensionEmp: number;
  pensionEr: number;
  bituahLeumi?: number;
  masHachnasa?: number;
  createdAt: string;
  onboardingDone?: boolean;
}

export interface StandingOrder {
  id: string | number;
  description: string;
  amount: number;
  dayOfMonth: number;
  cat: string;
  color: string;
  emoji: string;
  isActive: boolean;
  account?: string;
}

export interface Transaction {
  id: string | number;
  description: string;
  amount: number;
  date: string;
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
  avgCost: number;
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
  rate: number;
}

export interface MoneyMarketFund {
  id: string | number;
  name: string;
  value: number;
  yield: number;
}

export interface InvestmentState {
  kerenValue: number;
  kerenYTD?: number;
  kerenTrack?: string;
  pensionValue: number;
  pensionYTD?: number;
  pensionTrack?: string;
  savings: SavingsAccount[];
  moneyMarket: MoneyMarketFund[];
  portfolioHoldings: StockHolding[];
  portfolioCash: number;
  portfolioHistory: StockHistoryItem[];
}

export interface SnapshotItem {
  date: string;
  value: number;
}

export interface UserAppData {
  profile: UserProfile;
  transactions: Transaction[];
  budgetPlan: BudgetPlanItem[];
  investments: InvestmentState;
  snapshots: Record<string, SnapshotItem[]>;
  standingOrders: StandingOrder[];
  customRules?: Record<string, string>;
}

export interface ScraperInstitution {
  id: string;
  company_id: string;
  display_name: string;
  is_active: 0 | 1;
  last_scraped_at: string | null;
  created_at: string;
}

export interface ScraperLog {
  id: string;
  institution_id: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'error';
  transactions_found: number;
  transactions_new: number;
  error_message: string | null;
}

export interface PensionProfile {
  id: string;
  display_name: string;
  gross_salary: number;
  salary_effective_date: string;
  kh_employer_pct: number;
  kh_employee_pct: number;
  kh_ceiling: number;
  kh_start_date: string;
  kh_current_balance: number;
  pension_employer_pct: number;
  pension_employee_pct: number;
  pension_employer_compensation_pct: number;
  pension_ceiling: number;
  pension_start_date: string;
  pension_current_balance: number;
  disability_pct: number;
}
