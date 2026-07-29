import React, { useState, useEffect } from 'react';
import { UserAccount, UserAppData, Transaction, UserProfile, BudgetPlanItem, InvestmentState } from './types';
import { StorageService } from './services/storage';

import { AuthScreen } from './components/AuthScreen';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { TransactionsTab } from './components/TransactionsTab';
import { ImportTab } from './components/ImportTab';
import { InvestmentsTab } from './components/InvestmentsTab';
import { SettingsTab } from './components/SettingsTab';
import { BottomNav } from './components/BottomNav';
import { fmtILS } from './utils/formatters';

export default function App() {
  const [activeUser, setActiveUser] = useState<UserAccount | null>(null);
  const [appData, setAppData] = useState<UserAppData | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [salaryToast, setSalaryToast] = useState<number | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Initialize session
  useEffect(() => {
    const initializeAndSync = async () => {
      const activeId = StorageService.getActiveUserId();
      const accounts = StorageService.getAccounts();

      if (activeId) {
        const found = accounts.find((a) => a.id === activeId);
        if (found) {
          setActiveUser(found);
          loadUserData(found.id);
        }
      }
    };

    initializeAndSync();
  }, []);

  const loadUserData = (userId: string) => {
    const data = StorageService.getUserData(userId);
    setAppData(data);

    // Check auto salary insertion
    const autoSalaryTx = StorageService.checkAutoSalary(userId);
    if (autoSalaryTx) {
      setSalaryToast(autoSalaryTx.amount);
      setTimeout(() => setSalaryToast(null), 5000);
      // Reload refreshed data
      setAppData(StorageService.getUserData(userId));
    }
  };

  const handleAuthSuccess = async (account: UserAccount) => {
    setActiveUser(account);
    const data = StorageService.getUserData(account.id);
    setAppData(data);

    if (!data.profile || !data.profile.onboardingDone) {
      setNeedsOnboarding(true);
    }
  };

  const handleOnboardingDone = (newProfile: UserProfile) => {
    if (!activeUser) return;
    const doneProfile = { ...newProfile, onboardingDone: true };
    const updated = { ...appData!, profile: doneProfile };
    setAppData(updated);
    StorageService.saveUserData(activeUser.id, { profile: doneProfile });
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

  const handleLogout = () => {
    StorageService.logout();
    setActiveUser(null);
    setAppData(null);
  };

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

  // Render AuthScreen if user is not logged in
  if (!activeUser || !appData) {
    return <AuthScreen onSuccess={handleAuthSuccess} />;
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

  const currentMonthYear = new Intl.DateTimeFormat('he-IL', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative">
      {/* Top Fixed Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-4 py-3">
        <div className="max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-right">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg">
              💎
            </div>
            <div>
              <h1 className="text-sm font-black text-white leading-tight">FinanceIL</h1>
              <p className="text-[10px] text-slate-400 capitalize">{currentMonthYear}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="block text-xs font-bold text-slate-200 truncate max-w-[120px]">
                {appData.profile.name}
              </span>
              <span className="block text-[10px] text-emerald-400 font-num">
                {fmtILS(appData.profile.netSalary)}
              </span>
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
      <main className="max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto px-4 pt-4">
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
