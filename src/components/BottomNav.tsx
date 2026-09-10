import React from 'react';
import { LayoutDashboard, ArrowLeftRight, ChartPie, TrendingUp, Settings, Sprout } from 'lucide-react';

interface BottomNavProps { activeTab: string; onTabChange: (tab: string) => void; }
export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'התזרים שלי', icon: LayoutDashboard },
    { id: 'transactions', label: 'תנועות', icon: ArrowLeftRight },
    { id: 'budget', label: 'התקציב שלי', icon: ChartPie },
    { id: 'investments', label: 'השקעות', icon: TrendingUp },
    { id: 'settings', label: 'הגדרות', icon: Settings },
  ];
  return <nav className="v2-navigation" aria-label="ניווט ראשי" dir="rtl"><button className="v2-nav-brand" onClick={() => onTabChange('dashboard')} aria-label="AIfina — התזרים שלי"><span className="v2-brand-symbol">✳</span><span>AIfina<small>הכסף שלך. בדרך שלך.</small></span></button><div className="v2-nav-label">המרחב שלך</div><div className="v2-nav-items">{tabs.map(tab => { const Icon = tab.icon; const active = activeTab === tab.id; return <button key={tab.id} onClick={() => onTabChange(tab.id)} aria-current={active ? 'page' : undefined} className={`v2-nav-item ${active ? 'is-active' : ''} ${tab.id === 'settings' ? 'v2-nav-settings' : ''}`}><Icon size={20} strokeWidth={active ? 2 : 1.6} /><span>{tab.label}</span>{active && <i />}</button>; })}</div><div className="v2-nav-bottom"><div className="v2-nav-message"><Sprout size={24} /><strong>הרגלים קטנים.<br />שינוי גדול.</strong><p>כל מבט בתזרים הוא עוד צעד לשליטה בכסף שלך.</p></div><div className="v2-nav-version"><span>AIfina V2</span><span>המרחב הפיננסי שלך</span></div></div></nav>;
};
