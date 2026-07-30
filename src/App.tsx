import React, { useState, useEffect } from 'react';
import { UserAccount, UserAppData, Transaction, UserProfile, BudgetPlanItem, InvestmentState } from './types';
import { StorageService } from './services/storage';
import { useAuth } from './auth/AuthContext';
import AuthPage from './auth/AuthPage';
import { setTokenProvider } from './services/storage';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { TransactionsTab } from './components/TransactionsTab';
import { ImportTab } from './components/ImportTab';
import { InvestmentsTab } from './components/InvestmentsTab';
import { SettingsTab } from './components/SettingsTab';
import { BottomNav } from './components/BottomNav';
import { fmtILS } from './utils/formatters';

export default function App() {
  const { user: authUser, accessToken, isLoading: authLoading, logout: authLogout, logoutAll: authLogoutAll } = useAuth();

  // Register token provider so StorageService can sync data to server
  useEffect(() => {
    setTokenProvider(() => accessToken);
  }, [accessToken]);

  const [appData, setAppData] = useState<UserAppData | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [salaryToast, setSalaryToast] = useState<number | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Build UserAccount-compatible object from JWT user for StorageService compatibility
  const activeUser: UserAccount | null = authUser ? {
    id: authUser.id,
    username: authUser.email,
    passwordHash: '',
    displayName: authUser.name || authUser.email.split('@')[0],
    email: authUser.email,
    createdAt: '',
    profile: appData?.profile ?? ({} as UserProfile),
  } : null;

  // Load user data whenever the authenticated user changes
  useEffect(() => {
    if (!authUser || !accessToken) { setAppData(null); setNeedsOnboarding(false); return; }
    StorageService.setActiveUserId(authUser.id);

    // Load from server first (cross-device sync), fall back to localStorage
    StorageService.loadFromServer(authUser.id, accessToken).then(serverData => {
      if (serverData) {
        // Server is source of truth — update localStorage
        localStorage.setItem(`fil_u_data_${authUser.id}`, JSON.stringify(serverData));
      }
      const data = StorageService.getUserData(authUser.id);
      setAppData(data);
      // Check onboardingDone from data OR from a local browser flag (survives server restarts)
      const localDone = localStorage.getItem(`fil_onboarded_${authUser.id}`) === '1';
      const hasRealData = data.profile && (data.profile.netSalary > 0 || (data.transactions && data.transactions.length > 0));
      if (!data.profile?.onboardingDone && !localDone && !hasRealData) setNeedsOnboarding(true);
      const autoSalaryTx = StorageService.checkAutoSalary(authUser.id);
      if (autoSalaryTx) {
        setSalaryToast(autoSalaryTx.amount);
        setTimeout(() => setSalaryToast(null), 5000);
        setAppData(StorageService.getUserData(authUser.id));
      }
    });
  }, [authUser?.id]); // eslint-disable-line

  const handleOnboardingDone = (newProfile: UserProfile) => {
    if (!activeUser) return;
    const doneProfile = { ...newProfile, onboardingDone: true };
    const updated = { ...appData!, profile: doneProfile };
    setAppData(updated);
    StorageService.saveUserData(activeUser.id, { profile: doneProfile });
    // Persist onboarding completion in browser — survives server restarts
    localStorage.setItem(`fil_onboarded_${activeUser.id}`, '1');
    setNeedsOnboarding(false);
  };

  const handleAddTransaction = (newTx: Transaction) => {
    if (!activeUser || !appData) return;
    const updatedTxs = [newTx, ...appData.transactions];
    const updated = { ...appData, transactions: updatedTxs };
    setAppData(updated);
    StorageService.saveUserData(activeUser.id, { transactions: updatedTxs });
  };

  const handleImportTransactions = (newTxs: Transaction[]) => {
    if (!activeUser || !appData) return;
    const updatedTxs = [...newTxs, ...appData.transactions];
    const updated = { ...appData, transactions: updatedTxs };
    setAppData(updated);
    StorageService.saveUserData(activeUser.id, { transactions: updatedTxs });
  };

  const handleDeleteTransaction = (id: string | number) => {
    if (!activeUser || !appData) return;
    const updatedTxs = appData.transactions.filter((t) => t.id !== id);
    const updated = { ...appData, transactions: updatedTxs };
    setAppData(updated);
    StorageService.saveUserData(activeUser.id, { transactions: updatedTxs });
  };

  const handleUpdateCategory = (id: string | number, newCat: string) => {
    if (!activeUser || !appData) return;
    const updatedTxs = appData.transactions.map((t) =>
      t.id === id ? { ...t, cat: newCat } : t
    );
    const updated = { ...appData, transactions: updatedTxs };
    setAppData(updated);
    StorageService.saveUserData(activeUser.id, { transactions: updatedTxs });
  };

  const handleUpdateProfile = (newProfile: UserProfile) => {
    if (!activeUser || !appData) return;
    const updated = { ...appData, profile: newProfile };
    setAppData(updated);
    StorageService.saveUserData(activeUser.id, { profile: newProfile });
  };

  const handleUpdateBudget = (newPlan: BudgetPlanItem[]) => {
    if (!activeUser || !appData) return;
    const updated = { ...appData, budgetPlan: newPlan };
    setAppData(updated);
    StorageService.saveUserData(activeUser.id, { budgetPlan: newPlan });
  };

  const handleUpdateInvestments = (partialInv: Partial<InvestmentState>) => {
    if (!activeUser || !appData) return;
    const updatedInv = { ...appData.investments, ...partialInv };
    const updated = { ...appData, investments: updatedInv };
    setAppData(updated);
    StorageService.saveUserData(activeUser.id, { investments: updatedInv });
  };

  const handleLogout = () => { authLogout(); StorageService.logout(); setAppData(null); };

  const handleResetData = () => {
    if (!activeUser) return;
    // Explicitly save clean zero-state data
    const cleanData = {
      profile: {
        name: activeUser.displayName || 'משתמש',
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
        onboardingDone: true,
      },
      transactions: [],
      budgetPlan: appData?.budgetPlan || [],
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
    localStorage.removeItem('fil_sal_m_' + activeUser.id);
    StorageService.saveUserData(activeUser.id, cleanData);
    setAppData(cleanData as any);
  };

  const handleImportBackup = (parsedData: any) => {
    if (!activeUser) return;
    setAppData(parsedData);
    StorageService.saveUserData(activeUser.id, parsedData);
  };

  // Auth gate:
  // - If we have a cached user (from localStorage) → show app immediately, validate in background
  // - If no cache and still loading → brief spinner
  // - If loading done and no user → show login page
  if (authLoading && !authUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">טוען...</p>
        </div>
      </div>
    );
  }
  if (!authUser) return <AuthPage />;
  if (!appData) return null;

  // Render Onboarding if required
  if (needsOnboarding) {
    return (
      <Onboarding
        initialProfile={appData.profile}
        onDone={handleOnboardingDone}
      />
    );
  }

  const currentMonthYear = new Intl.DateTimeFormat('he-IL', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-x-hidden">
      {/* Top Fixed Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-4 py-4">
        <div className="max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-xl">
              💎
            </div>
            <div>
              <h1 className="text-sm font-black text-white leading-tight">FinanceIL</h1>
              <p className="text-[10px] text-slate-500">{currentMonthYear}</p>
            </div>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-right min-w-0">
              <span className="block text-xs font-semibold text-slate-200 truncate max-w-[110px]">
                {appData.profile.name}
              </span>
              <span className="block text-[11px] text-emerald-400 font-bold">
                {fmtILS(appData.profile.netSalary)} / חודש
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
              {(appData.profile.name || '?')[0]}
            </div>
          </div>
        </div>
      </header>

      {/* Toast Alert for Auto-Salary Insertion */}
      {salaryToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs animate-fade-in max-w-sm text-center">
          <span>💰</span>
          <span>משכורת חודשית בסך {fmtILS(salaryToast)} התווספה אוטומטית!</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto px-4 pt-5 pb-28">
        {activeTab === 'dashboard' && (
          <Dashboard
            profile={appData.profile}
            transactions={appData.transactions}
            budgetPlan={appData.budgetPlan}
            holdings={appData.investments.portfolioHoldings || []}
            portfolioCash={appData.investments.portfolioCash || 0}
            onAddTransaction={handleAddTransaction}
            onUpdateCategory={handleUpdateCategory}
            onNavigateToTab={(t) => setActiveTab(t)}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsTab
            transactions={appData.transactions}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onUpdateCategory={handleUpdateCategory}
          />
        )}

        {activeTab === 'import' && (
          <ImportTab
            onImportTransactions={handleImportTransactions}
            onUpdateInvestment={handleUpdateInvestments}
          />
        )}

        {activeTab === 'investments' && (
          <InvestmentsTab
            profile={appData.profile}
            investments={appData.investments}
            onUpdateInvestments={handleUpdateInvestments}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            profile={appData.profile}
            budgetPlan={appData.budgetPlan}
            account={activeUser}
            appData={appData}
            onUpdateProfile={handleUpdateProfile}
            onUpdateBudget={handleUpdateBudget}
            onLogout={handleLogout}
            onResetData={handleResetData}
            onImportBackupData={handleImportBackup}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
