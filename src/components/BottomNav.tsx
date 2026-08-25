import React from 'react';
import { Home, CreditCard, PieChart, TrendingUp, Settings } from 'lucide-react';

interface BottomNavProps { activeTab: string; onTabChange: (tab: string) => void; }

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'ראשי', icon: Home },
    { id: 'transactions', label: 'עסקאות', icon: CreditCard },
    { id: 'budget', label: 'תקציב', icon: PieChart },
    { id: 'investments', label: 'השקעות', icon: TrendingUp },
    { id: 'settings', label: 'הגדרות', icon: Settings },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-line shadow-sm">
      <div className="max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto flex items-center px-1 sm:px-2 pb-safe pt-1.5">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => onTabChange(tab.id)} className="flex flex-1 min-w-0 flex-col items-center gap-0.5 py-1.5 px-1 rounded-xl transition-all cursor-pointer">
              <Icon className={`w-5 h-5 transition-colors ${active ? 'text-primary' : 'text-muted'}`} strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[10px] font-semibold leading-none transition-colors ${active ? 'text-primary' : 'text-muted'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
