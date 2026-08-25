/**
 * FinanceIL - LocalStorage & User Session Management Service
 */
import {
  UserAccount,
  UserProfile,
  Transaction,
  BudgetPlanItem,
  InvestmentState,
  SnapshotItem,
  StandingOrder,
  UserAppData,
} from '../types';
import { getMemToken } from '../auth/AuthContext';
import { categorize, DEFAULT_BUDGET_PLAN } from '../utils/categories';
import { getMonthKey } from '../utils/formatters';



const KEYS = {
  USERS: 'fil_users_list',
  ACTIVE_USER: 'fil_active_user_id',
  SALARY_MONTHS_PREFIX: 'fil_sal_m_',
  DATA_PREFIX: 'fil_u_data_',
};

// Token provider â€” set from AuthContext so StorageService can call authenticated server endpoints
let _tokenProvider: (() => string | null) | null = null;
export function setTokenProvider(fn: () => string | null) { _tokenProvider = fn; }

// Seed sample demo data
const DEMO_PROFILE: UserProfile = {
  name: '×™×©×¨××œ ×™×©×¨××œ×™',
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
  onboardingDone: true,
};

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: 101, description: '×ž×©×›×•×¨×ª ×—×•×“×©×™×ª', amount: 16500, date: '2026-07-10', cat: '×”×›× ×¡×”', color: '#10B981', emoji: 'ðŸ’°', account: '×‘× ×§ ×”×¤×•×¢×œ×™×', auto: true },
  { id: 102, description: '×©×›×¨ ×“×™×¨×” - ×™×•×œ×™', amount: -4800, date: '2026-07-01', cat: '×“×™×•×¨', color: '#64748B', emoji: 'ðŸ ', account: '×”×•×¨××ª ×§×‘×¢' },
  { id: 103, description: '×©×•×¤×¨×¡×œ ×“×™×œ ×¨×¢× × ×”', amount: -680, date: '2026-07-24', cat: '×¡×•×¤×¨×ž×¨×§×˜', color: '#22C55E', emoji: 'ðŸ›’', account: 'Max' },
  { id: 104, description: '×•×•×œ×˜ - ×’\'×™×¨×£ ×¡×•×©×™', amount: -185, date: '2026-07-26', cat: '×ž×¡×¢×“×•×ª ×•×§×¤×”', color: '#F97316', emoji: 'ðŸ½ï¸', account: 'Max' },
  { id: 105, description: '×—×‘×¨×ª ×”×—×©×ž×œ', amount: -340, date: '2026-07-15', cat: '×—×©×‘×•× ×•×ª ×‘×™×ª', color: '#EAB308', emoji: 'ðŸ’¡', account: '×‘× ×§ ×”×¤×•×¢×œ×™×' },
  { id: 106, description: '×¤×– - ×“×œ×§ ×ž×ª×—× ×©×¤×™×™×', amount: -290, date: '2026-07-20', cat: '×“×œ×§ ×•×¨×›×‘', color: '#84CC16', emoji: 'â›½', account: 'Max' },
  { id: 107, description: '×¡×•×¤×¨-×¤××¨× ×§× ×™×•×Ÿ ×¨× × ×™×', amount: -145, date: '2026-07-22', cat: '×‘×¨×™××•×ª', color: '#14B8A6', emoji: 'ðŸ¥', account: 'Max' },
  { id: 108, description: '×¤×¨×˜× ×¨ ×ª×§×©×•×¨×ª', amount: -120, date: '2026-07-05', cat: '×ª×§×©×•×¨×ª', color: '#06B6D4', emoji: 'ðŸ“±', account: '×”×•×¨××ª ×§×‘×¢' },
  { id: 109, description: '× ×˜×¤×œ×™×§×¡ ×—×•×“×©×™', amount: -65, date: '2026-07-03', cat: '×‘×™×“×•×¨', color: '#EC4899', emoji: 'ðŸŽ¬', account: 'Max' },
  { id: 110, description: '×–××¨×” ×§× ×™×•×Ÿ ×¢×–×¨×™××œ×™', amount: -390, date: '2026-07-18', cat: '×§× ×™×•×ª', color: '#F59E0B', emoji: 'ðŸ›ï¸', account: 'Max' },
];

const DEMO_INVESTMENTS: InvestmentState = {
  kerenValue: 84500,
  kerenYTD: 6.8,
  pensionValue: 240000,
  pensionYTD: 8.2,
  savings: [
    { id: 1, name: '×¤×§"×ž ×—×•×“×©×™ ×ž×ª×—×“×©', bank: '×‘× ×§ ×”×¤×•×¢×œ×™×', value: 35000, rate: 4.2 },
  ],
  moneyMarket: [
    { id: 101, name: '×ž×’×“×œ ×©×§×œ×™× ×›×¡×¤×™×ª', value: 50000, yield: 4.6 },
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
          displayName: '×™×©×¨××œ ×™×©×¨××œ×™',
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
            standingOrders: [],
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
      throw new Error('×©× ×”×ž×©×ª×ž×© ×›×‘×¨ ×§×™×™× ×‘×ž×¢×¨×›×ª');
    }

    const newId = 'u_' + Date.now();
    const defaultProfile: UserProfile = {
      name: displayName.trim() || '×ž×©×ª×ž×© ×—×“×©',
      netSalary: 0,
      grossSalary: 0,
      salaryDay: 10,
      creditDay: 1,
      bankBalance: 0,
      creditDebt: 0,
      rent: 0,
      rentDay: 1,
      hasKeren: false,
      kerenEmp: 0,
      kerenEr: 0,
      hasPension: false,
      pensionEmp: 0,
      pensionEr: 0,
      createdAt: new Date().toISOString(),
    };

    const newAccount: UserAccount = {
      id: newId,
      username: cleanUser,
      passwordHash: hashString(password),
      displayName: displayName.trim() || '×ž×©×ª×ž×© ×—×“×©',
      createdAt: new Date().toISOString(),
      profile: defaultProfile,
    };

    accounts.push(newAccount);
    localStorage.setItem(KEYS.USERS, JSON.stringify(accounts));

    // Initialize user empty data
    const initData: UserAppData = {
      profile: defaultProfile,
      transactions: [],
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
      standingOrders: [],
    };

    this.saveUserData(newId, initData);
    this.setActiveUserId(newId);





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
      throw new Error('×©× ×ž×©×ª×ž×© ××• ×¡×™×¡×ž×” ×©×’×•×™×™×');
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
    return this.registerAccount('demo', '123456', '×™×©×¨××œ ×™×©×¨××œ×™');
  }

  static logout(): void {
    this.setActiveUserId(null);
  }

  static getUserData(userId: string): UserAppData {
    try {
      const raw = localStorage.getItem(KEYS.DATA_PREFIX + userId);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.standingOrders) parsed.standingOrders = [];
        if (!parsed.customRules) parsed.customRules = {};
        return parsed;
      }
    } catch (e) {
      console.error('Error loading user data:', e);
    }
    // For the demo account, return demo data; for real users return empty defaults
    if (userId === 'demo_user_id') {
      return {
        profile: DEMO_PROFILE,
        transactions: DEMO_TRANSACTIONS,
        budgetPlan: DEFAULT_BUDGET_PLAN,
        investments: DEMO_INVESTMENTS,
        snapshots: {},
        standingOrders: [],
        customRules: {},
      };
    }
    return {
      profile: {
        name: '×ž×©×ª×ž×© ×—×“×©',
        netSalary: 0,
        grossSalary: 0,
        salaryDay: 10,
        creditDay: 1,
        bankBalance: 0,
        creditDebt: 0,
        rent: 0,
        rentDay: 1,
        hasKeren: false,
        kerenEmp: 0,
        kerenEr: 0,
        hasPension: false,
        pensionEmp: 0,
        pensionEr: 0,
        createdAt: new Date().toISOString(),
      },
      transactions: [],
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
      standingOrders: [],
      customRules: {},
    };
  }

  static saveUserData(userId: string, data: Partial<UserAppData>): void {
    try {
      const current = this.getUserData(userId);
      const updated = { ...current, ...data };
      localStorage.setItem(KEYS.DATA_PREFIX + userId, JSON.stringify(updated));

      // Server sync â€” use in-memory token (always current, never stale closure)
      const token = getMemToken();
      if (token) {
        fetch('/api/user/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          credentials: 'include',
          body: JSON.stringify({ userId, data: updated }),
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Error saving user data:', e);
    }
  }

  // Push full localStorage data to server (call on login to ensure server has latest)
  static pushToServer(userId: string): void {
    const token = getMemToken();
    if (!token) return;
    const data = this.getUserData(userId);
    fetch('/api/user/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify({ userId, data }),
    }).catch(() => {});
  }

  static async loadFromServer(userId: string, token: string): Promise<UserAppData | null> {
    try {
      const res = await fetch(`/api/user/load/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
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
        (t.cat === '×”×›× ×¡×”' || t.description.includes('×ž×©×›×•×¨×ª'))
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

    const cat = categorize('×ž×©×›×•×¨×ª');
    const newTx: Transaction = {
      id: Date.now(),
      description: `×ž×©×›×•×¨×ª ×—×•×“×©×™×ª â€” ${monthName}`,
      amount: Math.round(profile.netSalary * 100) / 100,
      date: dateStr,
      cat: cat.cat,
      color: cat.color,
      emoji: cat.emoji,
      account: '××•×˜×•×ž×˜×™',
      auto: true,
    };

    doneMonths.push(monthKey);
    localStorage.setItem(salMonthsKey, JSON.stringify(doneMonths));

    const updatedTxs = [newTx, ...transactions];

    // Auto-deposit to keren hishtalmut and pension
    const inv = data.investments;
    const updatedInv = { ...inv };
    const updatedSnapshots = { ...data.snapshots };

    if (profile.hasKeren && profile.grossSalary > 0) {
      const kerenDeposit = Math.round(profile.grossSalary * ((profile.kerenEmp || 0) + (profile.kerenEr || 0)) / 100);
      updatedInv.kerenValue = (inv.kerenValue || 0) + kerenDeposit;
      const kerenSnaps = [...(updatedSnapshots.kerenValue || [])];
      kerenSnaps.push({ date: dateStr, value: updatedInv.kerenValue });
      updatedSnapshots.kerenValue = kerenSnaps;
    }

    if (profile.hasPension && profile.grossSalary > 0) {
      const pensionDeposit = Math.round(profile.grossSalary * ((profile.pensionEmp || 0) + (profile.pensionEr || 0)) / 100);
      updatedInv.pensionValue = (inv.pensionValue || 0) + pensionDeposit;
      const pensionSnaps = [...(updatedSnapshots.pensionValue || [])];
      pensionSnaps.push({ date: dateStr, value: updatedInv.pensionValue });
      updatedSnapshots.pensionValue = pensionSnaps;
    }

    this.saveUserData(userId, { transactions: updatedTxs, investments: updatedInv, snapshots: updatedSnapshots });
    return newTx;
  }

  static checkAutoStandingOrders(userId: string): Transaction[] {
    const data = this.getUserData(userId);
    const standingOrders: StandingOrder[] = data.standingOrders || [];
    const { transactions } = data;
    const now = new Date();
    const today = now.getDate();
    const monthKey = getMonthKey(now);
    const trackKey = 'fil_so_m_' + userId;
    let done: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(trackKey);
      if (raw) done = JSON.parse(raw);
    } catch {}

    const injected: Transaction[] = [];
    const newTxs = [...transactions];

    for (const so of standingOrders) {
      if (!so.isActive) continue;
      if (today < so.dayOfMonth) continue;
      const soKey = String(so.id);
      if (done[soKey] === monthKey) continue;
      const acctTag = 'הוראת קבע:' + soKey;
      const exists = transactions.some((t) => {
        const d = new Date(t.date);
        return (
          t.account === acctTag &&
          !isNaN(d.getTime()) &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
      if (exists) { done[soKey] = monthKey; continue; }
      const txDate = new Date(now.getFullYear(), now.getMonth(), so.dayOfMonth);
      const newTx: Transaction = {
        id: Date.now() + Math.random(),
        description: so.description,
        amount: so.amount,
        date: txDate.toISOString().split('T')[0],
        cat: so.cat,
        color: so.color,
        emoji: so.emoji,
        account: acctTag,
        auto: true,
      };
      newTxs.unshift(newTx);
      injected.push(newTx);
      done[soKey] = monthKey;
    }

    if (injected.length > 0) {
      this.saveUserData(userId, { transactions: newTxs });
      localStorage.setItem(trackKey, JSON.stringify(done));
    }
    return injected;
  }
}