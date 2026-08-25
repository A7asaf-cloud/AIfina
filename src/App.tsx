import React, { useState, useEffect } from 'react';
import { UserAccount, UserAppData, Transaction, UserProfile, BudgetPlanItem, InvestmentState, StandingOrder } from './types';
import { StorageService } from './services/storage';
import { useAuth, getMemToken } from './auth/AuthContext';
import { CATEGORIES, CategoryKey } from './utils/categories';
import AuthPage from './auth/AuthPage';
import { setTokenProvider } from './services/storage';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { TransactionsTab } from './components/TransactionsTab';
import { BudgetTab } from './components/BudgetTab';
import { InvestmentsTab } from './components/InvestmentsTab';
import { SettingsTab } from './components/SettingsTab';
import { BottomNav } from './components/BottomNav';
import { ToastHost } from './components/ui';
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

    // Cross-device sync strategy:
    // 1. Try to load from server (another device may have saved data there)
    // 2. If server has data → use it (server wins)
    // 3. If server is empty → use localStorage and push it to server (this device is source of truth)
    const localToken = getMemToken();
    StorageService.loadFromServer(authUser.id, localToken || accessToken || '').then(serverData => {
      if (serverData && serverData.transactions) {
        // Server has real data — treat as source of truth
        localStorage.setItem(`fil_u_data_${authUser.id}`, JSON.stringify(serverData));
      } else {
        // Server is empty (restarted) — push our local data up
        StorageService.pushToServer(authUser.id);
      }
      const data = StorageService.getUserData(authUser.id);
      setAppData(data);
      // Check onboardingDone from data OR from a local browser flag (survives server restarts)
      const localDone = localStorage.getItem(`fil_onboarded_${authUser.id}`) === '1';
      const hasRealData = data.profile && (data.profile.netSalary > 0 || (data.transactions && data.transactions.length > 0));
      if (!data.profile?.onboardingDone && !localDone && !hasRealData) setNeedsOnboarding(true);
      const autoSalaryTx = StorageService.checkAutoSalary(authUser.id);
      StorageService.checkAutoStandingOrders(authUser.id);
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

    const targetTx = appData.transactions.find((t) => t.id === id);
    if (!targetTx) return;

    const targetDesc = targetTx.description;
    const targetDescClean = targetDesc.toLowerCase().trim();

    const currentRules = appData.customRules || {};
    const updatedRules = { ...currentRules, [targetDesc]: newCat };

    const catMeta = CATEGORIES[newCat as CategoryKey] || CATEGORIES['שונות'];

    const updatedTxs = appData.transactions.map((t) => {
      if (t.id === id || t.description.toLowerCase().trim() === targetDescClean) {
        return {
          ...t,
          cat: newCat,
          color: catMeta.color,
          emoji: catMeta.emoji,
        };
      }
      return t;
    });

    const updated = { ...appData, transactions: updatedTxs, customRules: updatedRules };
    setAppData(updated);
    StorageService.saveUserData(activeUser.id, { transactions: updatedTxs, customRules: updatedRules });
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


  const handleAddStandingOrder = (so: StandingOrder) => {
    if (!activeUser || !appData) return;
    const orders = [...(appData.standingOrders || []), so];
    const updated = { ...appData, standingOrders: orders };
    setAppData(updated);
    StorageService.saveUserData(activeUser.id, { standingOrders: orders });
  };

  const handleUpdateStandingOrder = (so: StandingOrder) => {
    if (!activeUser || !appData) return;
    const orders = (appData.standingOrders || []).map((o) => (o.id === so.id ? so : o));
    const updated = { ...appData, standingOrders: orders };
    setAppData(updated);
    StorageService.saveUserData(activeUser.id, { standingOrders: orders });
  };

  const handleDeleteStandingOrder = (id: string | number) => {
    if (!activeUser || !appData) return;
    const orders = (appData.standingOrders || []).filter((o) => o.id !== id);
    const updated = { ...appData, standingOrders: orders };
    setAppData(updated);
    StorageService.saveUserData(activeUser.id, { standingOrders: orders });
  };

  const handleUpdateSnapshots = (newSnapshots: Record<string, import('./types').SnapshotItem[]>) => {
    if (!activeUser || !appData) return;
    const updated = { ...appData, snapshots: newSnapshots };
    setAppData(updated);
    StorageService.saveUserData(activeUser.id, { snapshots: newSnapshots });
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
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-line border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">טוען...</p>
        </div>
      </div>
    );
  }
  if (!authUser) return <AuthPage />;
  if (!appData) {
    return (
      <div className="min-h-dvh bg-surface flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-line border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">טוען...</p>
        </div>
      </div>
    );
  }

  // Render Onboarding if required
  if (needsOnboarding) {
    return (
      <Onboarding
        initialProfile={appData.profile}
        onDone={handleOnboardingDone}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-surface text-ink font-sans relative overflow-x-clip">
      {/* Salary Toast */}
      {salaryToast && (
        <div className="fixed top-[calc(1rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[45] bg-income text-white font-bold px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-sm animate-slide-up w-[calc(100%-2rem)] max-w-sm text-center">
          <span>💰</span>
          <span>משכורת חודשית בסך {fmtILS(salaryToast)} התווספה אוטומטית!</span>
        </div>
      )}

      <main className="max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <div key={activeTab} className="tab-content">
        {activeTab === 'dashboard' && (
          <Dashboard
            profile={appData.profile}
            transactions={appData.transactions}
            budgetPlan={appData.budgetPlan}
            holdings={appData.investments.portfolioHoldings || []}
            portfolioCash={appData.investments.portfolioCash || 0}
            onAddTransaction={handleAddTransaction}
            onUpdateCategory={handleUpdateCategory}
            standingOrders={appData.standingOrders || []}
            onNavigateToTab={(t) => setActiveTab(t)}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsTab
            transactions={appData.transactions}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onUpdateCategory={handleUpdateCategory}
            onImportTransactions={handleImportTransactions}
            onUpdateInvestment={handleUpdateInvestments}
          />
        )}

        {activeTab === 'budget' && (
          <BudgetTab
            profile={appData.profile}
            transactions={appData.transactions}
            budgetPlan={appData.budgetPlan}
            onUpdateBudget={handleUpdateBudget}
          />
        )}

        {activeTab === 'investments' && (
          <InvestmentsTab
            profile={appData.profile}
            investments={appData.investments}
            snapshots={appData.snapshots || {}}
            onUpdateInvestments={handleUpdateInvestments}
            onUpdateSnapshots={handleUpdateSnapshots}
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
            standingOrders={appData.standingOrders || []}
            onAddStandingOrder={handleAddStandingOrder}
            onUpdateStandingOrder={handleUpdateStandingOrder}
            onDeleteStandingOrder={handleDeleteStandingOrder}
            onImportBackupData={handleImportBackup}
          />
        )}
        </div>
      </main>

      <ToastHost />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
