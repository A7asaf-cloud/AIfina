import React, { useMemo } from 'react';
import { Building2, CreditCard, ExternalLink, FileUp, Link2, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { Transaction, UserProfile } from '../types';
import { CONFIG } from '../config';
import { fmtDate, fmtILS } from '../utils/formatters';
import { Button, Card } from './ui';

interface Props { profile: UserProfile; transactions: Transaction[]; onNavigateToTab: (tab: string) => void; }

export const ConnectionsTab: React.FC<Props> = ({ profile, transactions, onNavigateToTab }) => {
  const creditTransactions = useMemo(() => transactions.filter(transaction => transaction.paymentMethod === 'credit'), [transactions]);
  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const grouped = new Map<string, number>();
    creditTransactions.filter(transaction => transaction.amount < 0 && transaction.cashflowDate && transaction.cashflowDate >= today).forEach(transaction => grouped.set(transaction.cashflowDate!, (grouped.get(transaction.cashflowDate!) || 0) + Math.abs(transaction.amount)));
    const first = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))[0];
    return first ? { date: first[0], amount: first[1] } : null;
  }, [creditTransactions]);
  const startSecureConnection = () => {
    if (CONFIG.OPEN_BANKING_CONNECT_URL) window.location.assign(CONFIG.OPEN_BANKING_CONNECT_URL);
  };

  return <main dir="rtl" className="mx-auto max-w-4xl space-y-5 px-4 py-7 md:px-8">
    <header className="rounded-3xl bg-gradient-to-bl from-[#173b32] to-[#42745f] px-6 py-7 text-white"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[#d7f281]"><Link2 size={18} /><span className="text-sm font-bold">חיבורים פיננסיים</span></div><h1 className="mt-2 text-3xl font-extrabold">האשראי שלך, במעקב</h1><p className="mt-2 text-sm leading-6 text-emerald-50/80">חיבור מאובטח מאפשר למשוך עסקאות ישירות ולשמור את התזרים מעודכן.</p></div><CreditCard className="text-[#d7f281]" size={34} /></div></header>
    <div className="grid gap-4 sm:grid-cols-2">
      <Card><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary"><CreditCard size={22} /></span><div><p className="text-xs text-muted">עסקאות אשראי במעקב</p><strong className="text-2xl text-ink">{creditTransactions.length}</strong></div></div></Card>
      <Card><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><RefreshCw size={20} /></span><div><p className="text-xs text-muted">החיוב הקרוב</p><strong className="text-lg text-ink">{upcoming ? fmtILS(upcoming.amount) + ' · ' + fmtDate(upcoming.date) : 'ממתין לפירוט אשראי'}</strong></div></div></Card>
    </div>
    <Card className="space-y-4"><div className="flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eaf5e5] text-[#39704b]"><Building2 size={22} /></span><div><h2 className="font-bold text-ink">חיבור חי לבנקאות פתוחה</h2><p className="mt-1 text-sm leading-6 text-muted">בזמן החיבור תעבור לאימות של ספק מורשה. AIfina לא מבקשת ולא שומרת סיסמה של הבנק או חברת האשראי.</p></div></div>{CONFIG.OPEN_BANKING_CONNECT_URL ? <Button onClick={startSecureConnection}><ExternalLink size={17} />חיבור אשראי מאובטח</Button> : <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>החיבור החי עדיין לא הוגדר.</strong><br />המסך מוכן; צריך להגדיר כתובת חיבור של ספק בנקאות פתוחה בשרת המאובטח כדי להפעיל אותו.</div>}<div className="flex items-center gap-2 text-xs text-muted"><LockKeyhole size={14} />הסכמה ניתנת לביטול אצל הספק בכל עת.</div></Card>
    <Card className="space-y-3"><div className="flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface text-primary"><FileUp size={22} /></span><div><h2 className="font-bold text-ink">בינתיים: מעקב מקובץ אשראי</h2><p className="mt-1 text-sm leading-6 text-muted">ייבוא פירוט Max, Cal או ישראכרט משייך כל עסקה אוטומטית לחיוב הקרוב על פי המחזור שהגדרת.</p></div></div><Button variant="outline" onClick={() => onNavigateToTab('transactions')}>ייבוא פירוט אשראי</Button></Card>
    <Card className="border-primary/15 bg-primary/5"><div className="flex gap-3"><ShieldCheck className="shrink-0 text-primary" /><p className="text-sm leading-6 text-muted"><strong className="text-ink">מחזור החיוב שלך:</strong> יום {profile.creditCycleDay ?? profile.creditDay} עד יום {profile.creditDay}. אפשר לשנות אותו בהגדרות.</p></div></Card>
  </main>;
};
