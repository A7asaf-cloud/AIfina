import React, { ReactNode, useEffect, useState } from 'react';
import { motion } from 'motion/react';

export const Card: React.FC<{ children: ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-card rounded-2xl shadow-sm border border-line p-4 ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}>{children}</div>
);

export const AnimatedCard: React.FC<{ children: ReactNode; className?: string; onClick?: () => void; delay?: number }> = ({ children, className = '', onClick, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay }}>
    <Card className={className} onClick={onClick}>{children}</Card>
  </motion.div>
);

export const SectionTitle: React.FC<{ title: string; action?: ReactNode }> = ({ title, action }) => (
  <div className="flex items-center justify-between mb-3"><h2 className="text-base font-bold text-ink">{title}</h2>{action}</div>
);

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
const BTN: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white shadow-sm',
  secondary: 'bg-secondary text-white shadow-sm',
  ghost: 'bg-surface text-ink',
  outline: 'bg-card border border-line text-ink',
  danger: 'bg-expense text-white',
};

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; fullWidth?: boolean }> = ({ variant = 'primary', fullWidth = false, className = '', ...rest }) => (
  <button {...rest} className={`h-12 rounded-xl font-semibold text-sm px-4 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${BTN[variant]} ${fullWidth ? 'w-full' : ''} ${className}`} />
);

export const Badge: React.FC<{ children: ReactNode; color?: string; className?: string }> = ({ children, color, className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${className}`} style={color ? { backgroundColor: color + '1A', color } : undefined}>{children}</span>
);

export const ProgressBar: React.FC<{ value: number; max?: number; color?: string; heightClass?: string }> = ({ value, max = 100, color, heightClass = 'h-2' }) => {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div dir="rtl" className={`w-full rounded-full overflow-hidden bg-surface ${heightClass}`}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color || '#4A6FFF' }} />
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => <div className={`skeleton ${className}`} />;

export const SkeletonCard: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <Card>
    <div className="flex items-center gap-3"><Skeleton className="w-10 h-10 !rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div></div>
    {Array.from({ length: Math.max(0, lines - 2) }).map((_, i) => <Skeleton key={i} className="h-3 w-full mt-3" />)}
  </Card>
);

let toastId = 0;
let pushFn: ((t: { id: number; message: string; kind: string }) => void) | null = null;

export function showToast(message: string, kind: 'success' | 'error' | 'info' = 'info') {
  if (pushFn) pushFn({ id: ++toastId, message, kind });
}
export function showToastError(message: string) { showToast(message || 'משהו השתבש', 'error'); }

const TOAST_BG: Record<string, string> = { success: 'bg-income', error: 'bg-expense', info: 'bg-ink' };

export const ToastHost: React.FC = () => {
  const [items, setItems] = useState<{ id: number; message: string; kind: string }[]>([]);
  useEffect(() => {
    pushFn = (t) => { setItems(p => [...p.slice(-2), t]); setTimeout(() => setItems(p => p.filter(x => x.id !== t.id)), 3500); };
    return () => { pushFn = null; };
  }, []);
  if (!items.length) return null;
  return (
    <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {items.map(t => <div key={t.id} className={`${TOAST_BG[t.kind] || 'bg-ink'} text-white animate-slide-up rounded-xl shadow-lg px-4 py-3 text-sm font-semibold text-center`}>{t.message}</div>)}
    </div>
  );
};
