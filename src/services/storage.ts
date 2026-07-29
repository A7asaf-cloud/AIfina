/**
 * FinanceIL - LocalStorage & User Session Management Service
 */
import {
  UserAccount,
  UserProfile,
  Transaction,
  BudgetPlanItem,
  InvestmentState,
  StockHolding,
  SavingsAccount,
  MoneyMarketFund,
  StockHistoryItem,
  SnapshotItem,
} from '../types';
import { categorize, DEFAULT_BUDGET_PLAN } from '../utils/categories';
import { getMonthKey } from '../utils/formatters';
import { getApiUrl } from '../utils/apiFallback';
import { GithubDbService } from './githubDb';

const KEYS = {
  USERS: 'fil_users_list',
  ACTIVE_USER: 'fil_active_user_id',
  SALARY_MONTHS_PREFIX: 'fil_sal_m_',
  DATA_PREFIX: 'fil_u_data_',
};

// Seed sample demo data
const DEMO_PROFILE: UserProfile = {
  name: 'ישראל ישראלי',
  netSalary: 16500,
  grossSalary: 22000,
  salaryDay: 10,
  creditDay: 1,
  bankBalance: 24500,
  creditDebt: 4200,
  rent: 4800,
  rentDay: 1,
  hasKeren: true,
  kerenEmp: 2.5,
  kerenEr: 7.5,
  hasPension: true,
  pensionEmp: 6.0,
  pensionEr: 14.83,
  createdAt: new Date().toISOString(),
};

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: 101, description: 'משכורת חודשית', amount: 16500, date: '2026-07-10', cat: 'הכנסה', color: '#10B981', emoji: '💰', account: 'בנק הפועלים', auto: true },
  { id: 102, description: 'שכר דירה - יולי', amount: -4800, date: '2026-07-01', cat: 'דיור', color: '#64748B', emoji: '🏠', account: 'הוראת קבע' },
  { id: 103, description: 'שופרסל דיל רעננה', amount: -680, date: '2026-07-24', cat: 'סופרמרקט', color: '#22C55E', emoji: '🛒', account: 'Max' },
  { id: 104, description: 'וולט - ג\'ירף סושי', amount: -185, date: '2026-07-26', cat: 'מסעדות וקפה', color: '#F97316', emoji: '🍽️', account: 'Max' },
  { id: 105, description: 'חברת החשמל', amount: -340, date: '2026-07-15', cat: 'חשבונות בית', color: '#EAB308', emoji: '💡', account: 'בנק הפועלים' },
  { id: 106, description: 'פז - דלק מתחם שפיים', amount: -290, date: '2026-07-20', cat: 'דלק ורכב', color: '#84CC16', emoji: '⛽', account: 'Max' },
  { id: 107, description: 'סופר-פארם קניון רננים', amount: -145, date: '2026-07-22', cat: 'בריאות', color: '#14B8A6', emoji: '🏥', account: 'Max' },
  { id: 108, description: 'פרטנר תקשורת', amount: -120, date: '2026-07-05', cat: 'תקשורת', color: '#06B6D4', emoji: '📱', account: 'הוראת קבע' },
  { id: 109, description: 'נטפליקס חודשי', amount: -65, date: '2026-07-03', cat: 'בידור', color: '#EC4899', emoji: '🎬', account: 'Max' },
  { id: 110, description: 'זארה קניון עזריאלי', amount: -390, date: '2026-07-18', cat: 'קניות', color: '#F59E0B', emoji: '🛍️', account: 'Max' },
];

const DEMO_INVESTMENTS: InvestmentState = {
  kerenValue: 84500,
  kerenYTD: 6.8,
  pensionValue: 240000,
  pensionYTD: 8.2,
  savings: [
    { id: 1, name: 'פק"מ חודשי מתחדש', bank: 'בנק הפועלים', value: 35000, rate: 4.2 },
  ],
  moneyMarket: [
    { id: 101, name: 'מגדל שקלים כספית', value: 50000, yield: 4.6 },
  ],
  portfolioHoldings: [
    { id: 201, symbol: 'NVDA', name: 'NVIDIA Corporation', shares: 25, avgCost: 110, color: '#22C55E' },
    { id: 202, symbol: 'AAPL', name: 'Apple Inc.', shares: 15, avgCost: 195, color: '#3B82F6' },
    { id: 203, symbol: 'TEVA.TA', name: 'Teva Pharmaceutical', shares: 300, avgCost: 14.5, color: '#8B5CF6' },
  ],
  portfolioCash: 2500,
  portfolioHistory: [
    { id: 1, type: 'deposit', amount: 5000, date: '2026-01-15' },
    { id: 2, type: 'buy', symbol: 'NVDA', shares: 25, price: 110, cost: 2750, date: '2026-02-10' },
  ],
};

export interface UserAppData {
  profile: UserProfile;
  transactions: Transaction[];
  budgetPlan: BudgetPlanItem[];
  investments: InvestmentState;
  snapshots: Record<string, SnapshotItem[]>; // e.g. 'kerenValue' -> [{date, value}]
}

// Simple string hashing helper
const hashString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString();
};

export class StorageService {
  // Get all registered accounts
  static getAccounts(): UserAccount[] {
    try {
      const raw = localStorage.getItem(KEYS.USERS);
      if (!raw) {
        // Initialize with default demo account
        const demoAccount: UserAccount = {
          id: 'demo_user_id',
          username: 'demo',
          passwordHash: hashString('123456'),
          displayName: 'ישראל ישראלי',
          email: 'demo@finance.il',
          createdAt: new Date().toISOString(),
          profile: DEMO_PROFILE,
        };
        localStorage.setItem(KEYS.USERS, JSON.stringify([demoAccount]));
        this.saveUserData('demo_user_id', {
          profile: DEMO_PROFILE,
          transactions: DEMO_TRANSACTIONS,
          budgetPlan: DEFAULT_BUDGET_PLAN,
          investments: DEMO_INVESTMENTS,
          snapshots: {
            kerenValue: [
              { date: '2026-01-01', value: 78000 },
              { date: '2026-04-01', value: 81200 },
              { date: '2026-07-01', value: 84500 },
            ],
            pensionValue: [
              { date: '2026-01-01', value: 220000 },
              { date: '2026-04-01', value: 231000 },
              { date: '2026-07-01', value: 240000 },
            ],
          },
        });
        return [demoAccount];
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static getActiveUserId(): string | null {
    return localStorage.getItem(KEYS.ACTIVE_USER);
  }

  static setActiveUserId(userId: string | null): void {
    if (userId) {
      localStorage.setItem(KEYS.ACTIVE_USER, userId);
    } else {
      localStorage.removeItem(KEYS.ACTIVE_USER);
    }
  }

  static registerAccount(username: string, password: string, displayName: string): UserAccount {
    const accounts = this.getAccounts();
    const cleanUser = username.trim().toLowerCase();
    if (accounts.some((a) => a.username.toLowerCase() === cleanUser)) {
      throw new Error('שם המשתמש כבר קיים במערכת');
    }

    const newId = 'u_' + Date.now();
    const defaultProfile: UserProfile = {
      name: displayName.trim() || 'משתמש חדש',
      netSalary: 14000,
      grossSalary: 18000,
      salaryDay: 10,
      creditDay: 1,
      bankBalance: 10000,
      creditDebt: 0,
      rent: 4500,
      rentDay: 1,
      hasKeren: true,
      kerenEmp: 2.5,
      kerenEr: 7.5,
      hasPension: true,
      pensionEmp: 6.0,
      pensionEr: 14.83,
      createdAt: new Date().toISOString(),
    };

    const newAccount: UserAccount = {
      id: newId,
      username: cleanUser,
      passwordHash: hashString(password),
      displayName: displayName.trim() || 'משתמש חדש',
      createdAt: new Date().toISOString(),
      profile: defaultProfile,
    };

    accounts.push(newAccount);
    localStorage.setItem(KEYS.USERS, JSON.stringify(accounts));

    // Initialize user empty data
    const initData: UserAppData = {
      profile: defaultProfile,
      transactions: [
        {
          id: Date.now(),
          description: 'מאזן פתיחה',
          amount: 10000,
          date: new Date().toISOString().split('T')[0],
          cat: 'הכנסה',
          color: '#10B981',
          emoji: '💰',
          account: 'בנק',
        },
      ],
      budgetPlan: DEFAULT_BUDGET_PLAN,
      investments: {
        kerenValue: 0,
        pensionValue: 0,
        savings: [],
        moneyMarket: [],
        portfolioHoldings: [],
        portfolioCash: 0,
        portfolioHistory: [],
      },
      snapshots: {},
    };

    this.saveUserData(newId, initData);
    this.setActiveUserId(newId);

    // Sync register to server in the background
    fetch(getApiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: newAccount, initData }),
    }).catch((err) => console.error('Failed to register on server:', err));

    // Sync to GitHub database
    GithubDbService.saveAccountToGithub(newAccount, initData);

    return newAccount;
  }

  static login(username: string, password: string): UserAccount {
    const accounts = this.getAccounts();
    const cleanUser = username.trim().toLowerCase();
    const passHash = hashString(password);

    const account = accounts.find(
      (a) => a.username.toLowerCase() === cleanUser && a.passwordHash === passHash
    );

    if (!account) {
      throw new Error('שם משתמש או סיסמה שגויים');
    }

    this.setActiveUserId(account.id);
    return account;
  }

  static loginAsDemo(): UserAccount {
    const accounts = this.getAccounts();
    const demo = accounts.find((a) => a.username === 'demo') || accounts[0];
    if (demo) {
      this.setActiveUserId(demo.id);
      return demo;
    }
    return this.registerAccount('demo', '123456', 'ישראל ישראלי');
  }

  static logout(): void {
    this.setActiveUserId(null);
  }

  static getUserData(userId: string): UserAppData {
    try {
      const raw = localStorage.getItem(KEYS.DATA_PREFIX + userId);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error loading user data:', e);
    }
    // Fallback default
    return {
      profile: DEMO_PROFILE,
      transactions: DEMO_TRANSACTIONS,
      budgetPlan: DEFAULT_BUDGET_PLAN,
      investments: DEMO_INVESTMENTS,
      snapshots: {},
    };
  }

  static saveUserData(userId: string, data: Partial<UserAppData>): void {
    try {
      const current = this.getUserData(userId);
      const updated = { ...current, ...data };
      localStorage.setItem(KEYS.DATA_PREFIX + userId, JSON.stringify(updated));

      // Asynchronously sync to server
      fetch(getApiUrl('/api/user/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, data: updated }),
      }).catch((err) => console.error('Failed to save to server:', err));

      // Asynchronously sync to GitHub database
      GithubDbService.saveUserDataToGithub(userId, updated);
    } catch (e) {
      console.error('Error saving user data:', e);
    }
  }

  // Check and inject monthly salary automatically when salaryDay is reached
  static checkAutoSalary(userId: string): Transaction | null {
    const data = this.getUserData(userId);
    const { profile, transactions } = data;
    if (!profile || !profile.netSalary || !profile.salaryDay) return null;

    const now = new Date();
    const today = now.getDate();
    if (today < profile.salaryDay) return null;

    const monthKey = getMonthKey(now);
    const salMonthsKey = KEYS.SALARY_MONTHS_PREFIX + userId;
    let doneMonths: string[] = [];
    try {
      const raw = localStorage.getItem(salMonthsKey);
      if (raw) doneMonths = JSON.parse(raw);
    } catch {}

    if (doneMonths.includes(monthKey)) return null;

    // Check if salary already present in transactions this month
    const exists = transactions.some((t) => {
      const d = new Date(t.date);
      return (
        !isNaN(d.getTime()) &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear() &&
        t.amount > 0 &&
        (t.cat === 'הכנסה' || t.description.includes('משכורת'))
      );
    });

    if (exists) {
      doneMonths.push(monthKey);
      localStorage.setItem(salMonthsKey, JSON.stringify(doneMonths));
      return null;
    }

    const salDate = new Date(now.getFullYear(), now.getMonth(), profile.salaryDay);
    const dateStr = salDate.toISOString().split('T')[0];
    const monthName = new Intl.DateTimeFormat('he-IL', {
      month: 'long',
      year: 'numeric',
    }).format(now);

    const cat = categorize('משכורת');
    const newTx: Transaction = {
      id: Date.now(),
      description: `משכורת חודשית — ${monthName}`,
      amount: Math.round(profile.netSalary * 100) / 100,
      date: dateStr,
      cat: cat.cat,
      color: cat.color,
      emoji: cat.emoji,
      account: 'אוטומטי',
      auto: true,
    };

    doneMonths.push(monthKey);
    localStorage.setItem(salMonthsKey, JSON.stringify(doneMonths));

    const updatedTxs = [newTx, ...transactions];
    this.saveUserData(userId, { transactions: updatedTxs });
    return newTx;
  }
}
