import React from 'react';
import { Home, CreditCard, Upload, TrendingUp, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard',    label: 'בית',      icon: Home },
    { id: 'transactions', label: 'עסקאות',   icon: CreditCard },
    { id: 'import',       label: 'ייבוא',    icon: Upload },
    { id: 'investments',  label: 'השקעות',   icon: TrendingUp },
    { id: 'settings',     label: 'הגדרות',   icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/80 z-50 shadow-2xl">
      <div className="max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto flex items-center justify-around px-2 py-2 pb-safe">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer min-w-[56px]"
            >
              <div className={`p-2 rounded-xl transition-all ${
                isActive ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
              }`}>
                <Icon className={`transition-all ${isActive ? 'w-5 h-5' : 'w-5 h-5'}`} />
              </div>
              <span className={`text-[10px] font-medium transition-colors leading-none ${
                isActive ? 'text-emerald-400' : 'text-slate-500'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
