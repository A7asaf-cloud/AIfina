import React from 'react';
import { Home, CreditCard, Upload, TrendingUp, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'בית', icon: Home },
    { id: 'transactions', label: 'עסקאות', icon: CreditCard },
    { id: 'import', label: 'ייבוא', icon: Upload },
    { id: 'investments', label: 'השקעות', icon: TrendingUp },
    { id: 'settings', label: 'הגדרות', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 z-50 py-2 px-3 shadow-2xl">
      <div className="max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
                isActive ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  isActive ? 'bg-emerald-500/15' : 'bg-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
