import React, { ReactNode, useCallback, useContext, useEffect, useRef, useState, createContext } from 'react';
import { motion } from 'motion/react';

export const Card = React.forwardRef<HTMLDivElement, { children: ReactNode; className?: string; onClick?: () => void }>(
  ({ children, className = '', onClick }, ref) => (
    <div ref={ref} onClick={onClick} className={`bg-card rounded-2xl shadow-sm border border-line p-4 ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}>{children}</div>
  )
);
Card.displayName = 'Card';

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

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const cls = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size];
  return <div className={`${cls} rounded-full border-2 border-line border-t-primary animate-spin`} />;
};

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="text-muted mb-3">{icon}</div>
    <h3 className="text-base font-bold text-ink mb-1">{title}</h3>
    {description && <p className="text-sm text-muted mb-4 max-w-xs">{description}</p>}
    {action && <button onClick={action.onClick} className="h-10 rounded-xl font-semibold text-sm px-5 bg-primary text-white shadow-sm transition-all cursor-pointer">{action.label}</button>}
  </div>
);

export type ConfirmVariant = 'danger' | 'warning' | 'info';
const CONFIRM_COLORS: Record<ConfirmVariant, string> = {
  danger: '#FF647C',
  warning: '#F2C94C',
  info: '#4A6FFF',
};

export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, confirmLabel = 'אישור', cancelLabel = 'ביטול', variant = 'info', onConfirm, onCancel }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => confirmBtnRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); return; }
      if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  const color = CONFIRM_COLORS[variant];

  return (
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center p-4 transition-all duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onCancel} />
      <div
        ref={dialogRef}
        className={`relative bg-card rounded-2xl shadow-xl border border-line w-full max-w-sm p-6 transition-all duration-200 ${open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        <button
          onClick={onCancel}
          className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer"
          aria-label="סגור"
        >
          ✕
        </button>
        <h3 id="confirm-title" className="text-base font-bold text-ink mb-2 pr-8">{title}</h3>
        <p id="confirm-message" className="text-sm text-muted mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="h-11 flex-1 rounded-xl font-semibold text-sm bg-surface text-ink transition-colors cursor-pointer">{cancelLabel}</button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className="h-11 flex-1 rounded-xl font-semibold text-sm text-white shadow-sm transition-colors cursor-pointer"
            style={{ backgroundColor: color }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ConfirmContextValue {
  confirm: (title: string, message: string, variant?: ConfirmVariant) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({ confirm: () => Promise.resolve(false) });

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: ConfirmVariant;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback((title: string, message: string, variant: ConfirmVariant = 'info') => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, title, message, variant, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        open={state?.open ?? false}
        title={state?.title ?? ''}
        message={state?.message ?? ''}
        variant={state?.variant ?? 'info'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => useContext(ConfirmContext).confirm;

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
    <div role="alert" aria-live="polite" className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {items.map(t => <div key={t.id} className={`${TOAST_BG[t.kind] || 'bg-ink'} text-white animate-slide-up rounded-xl shadow-lg px-4 py-3 text-sm font-semibold text-center`}>{t.message}</div>)}
    </div>
  );
};
