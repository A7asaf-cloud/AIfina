import React, { useId, useState } from 'react';
import { Transaction } from '../types';
import { categorize, ALL_CATS } from '../utils/categories';
import { X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { Button } from './ui';

interface AddTransactionModalProps {
  onClose: () => void;
  onAdd: (tx: Transaction) => void;
  initialStatus?: 'posted' | 'planned';
  initialTransaction?: Transaction;
}

const localDate = (offset = 0) => {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  return day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
};
const fieldClass = 'w-full min-w-0 bg-surface border border-line focus:border-primary rounded-xl px-3 py-3 text-sm text-ink outline-none';
const labelClass = 'block text-sm font-semibold text-ink mb-1.5';

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ onClose, onAdd, initialStatus = 'posted', initialTransaction }) => {
  const formId = useId();
  const existingStatus = initialTransaction?.status || (initialTransaction && initialTransaction.date > localDate() ? 'planned' : 'posted');
  const [desc, setDesc] = useState(initialTransaction?.description || '');
  const [amount, setAmount] = useState(initialTransaction ? String(Math.abs(initialTransaction.amount)) : '');
  const [type, setType] = useState<'expense' | 'income'>(initialTransaction && initialTransaction.amount > 0 ? 'income' : 'expense');
  const [status, setStatus] = useState<'posted' | 'planned'>(initialTransaction ? existingStatus === 'planned' || existingStatus === 'pending' ? 'planned' : 'posted' : initialStatus);
  const [date, setDate] = useState(initialTransaction?.date || localDate(initialStatus === 'planned' ? 1 : 0));
  const [customCat, setCustomCat] = useState<string | null>(initialTransaction?.cat || null);
  const [expenseType, setExpenseType] = useState<'fixed' | 'variable'>(initialTransaction?.expenseType || (initialTransaction?.auto ? 'fixed' : 'variable'));
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'cash' | 'credit'>(initialTransaction?.paymentMethod || 'bank');
  const [cashflowDate, setCashflowDate] = useState(initialTransaction?.cashflowDate || '');
  const [balanceIncluded, setBalanceIncluded] = useState(initialTransaction?.balanceIncluded ?? (existingStatus !== 'planned' && existingStatus !== 'pending'));
  const [error, setError] = useState('');

  const autoCat = type === 'income' ? ALL_CATS.find(c => c.cat === 'הכנסה') : desc.trim().length > 1 ? categorize(desc.trim()) : null;
  const activeCat = ALL_CATS.find(c => c.cat === customCat) || autoCat || ALL_CATS.find(c => c.cat === 'שונות')!;

  const changeStatus = (next: 'posted' | 'planned') => {
    if (next === 'posted' && status === 'planned') setBalanceIncluded(false);
    setStatus(next);
    setError('');
    if (next === 'planned' && date <= localDate()) setDate(localDate(1));
    if (next === 'posted' && date > localDate()) setDate(localDate());
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const raw = Number(amount);
    if (!Number.isFinite(raw) || raw <= 0 || !desc.trim() || !date) { setError('יש למלא תיאור, סכום חיובי ותאריך.'); return; }
    if (status === 'posted' && date > localDate()) { setError('לעסקה עתידית יש לבחור ״מתוכננת״.'); return; }
    if (paymentMethod === 'credit' && cashflowDate && cashflowDate < date) { setError('מועד החיוב צריך להיות בתאריך העסקה או אחריו.'); return; }
    onAdd({
      ...initialTransaction,
      id: initialTransaction?.id ?? crypto.randomUUID(),
      description: desc.trim(),
      amount: Math.round(raw * 100) / 100 * (type === 'expense' ? -1 : 1),
      kind: initialTransaction?.kind === 'transfer' || initialTransaction?.kind === 'credit-settlement' ? initialTransaction.kind : type,
      date,
      cat: activeCat.cat,
      color: activeCat.color,
      emoji: activeCat.emoji,
      account: initialTransaction?.account || 'ידני',
      status,
      balanceIncluded: status === 'posted' ? balanceIncluded : undefined,
      expenseType: type === 'expense' ? expenseType : undefined,
      paymentMethod,
      cashflowDate: paymentMethod === 'credit' ? cashflowDate || undefined : undefined,
    });
    onClose();
  };
  const title = initialTransaction ? 'עריכת עסקה' : status === 'planned' ? 'מתכננים קדימה' : 'הוספת עסקה';
  const id = (name: string) => formId + '-' + name;

  return (
    <ModalShell onClose={onClose} ariaLabel={title} panelClassName="text-right" maxWidthClass="sm:max-w-lg">
      <div className="flex justify-between items-start gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          <p className="text-sm text-muted mt-1">{status === 'planned' ? 'העסקה תיכלל בתחזית ותמתין לאישור ביצוע.' : 'עוד עדכון קטן, ותמונת החודש מדויקת יותר.'}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="סגירת חלון העסקה" className="w-9 h-9 shrink-0 rounded-full bg-surface grid place-items-center text-muted hover:text-ink cursor-pointer"><X size={17} /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset>
          <legend className="sr-only">סוג העסקה</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['expense', 'income'] as const).map(value => (
              <label key={value} className={'flex justify-center items-center gap-2 rounded-xl border py-3 text-sm font-bold cursor-pointer ' + (type === value ? value === 'expense' ? 'border-expense/30 bg-expense/10 text-expense' : 'border-income/30 bg-income/10 text-income' : 'border-line text-muted')}>
                <input type="radio" name={id('type')} checked={type === value} onChange={() => { setType(value); setCustomCat(null); }} className="accent-primary" />
                {value === 'expense' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                {value === 'expense' ? 'הוצאה' : 'הכנסה'}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor={id('description')} className={labelClass}>על מה העסקה?</label>
          <input id={id('description')} value={desc} onChange={event => { setDesc(event.target.value); setCustomCat(null); }} placeholder={type === 'expense' ? 'למשל, קניות בסופר' : 'למשל, משכורת'} maxLength={200} required autoFocus className={fieldClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={id('amount')} className={labelClass}>סכום בש״ח</label>
            <input id={id('amount')} type="number" inputMode="decimal" step="0.01" min="0.01" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" required className={fieldClass} />
          </div>
          <div>
            <label htmlFor={id('date')} className={labelClass}>{status === 'planned' ? 'מועד צפוי' : 'תאריך ביצוע'}</label>
            <input id={id('date')} type="date" value={date} onChange={event => { setDate(event.target.value); if (event.target.value > localDate()) setStatus('planned'); }} required className={fieldClass} />
          </div>
        </div>
        <fieldset className="rounded-xl bg-surface p-3">
          <legend className="sr-only">מצב העסקה</legend>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold">
            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name={id('status')} checked={status === 'posted'} onChange={() => changeStatus('posted')} className="accent-primary" />כבר בוצעה</label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name={id('status')} checked={status === 'planned'} onChange={() => changeStatus('planned')} className="accent-primary" />מתוכננת</label>
          </div>
        </fieldset>
        <div>
          <label htmlFor={id('category')} className={labelClass}>קטגוריה</label>
          <select id={id('category')} value={activeCat.cat} onChange={event => setCustomCat(event.target.value)} className={fieldClass}>
            {ALL_CATS.map(category => <option key={category.cat} value={category.cat}>{category.emoji} {category.cat}</option>)}
          </select>
        </div>
        <div className={'grid gap-3 ' + (type === 'expense' ? 'grid-cols-2' : 'grid-cols-1')}>
          {type === 'expense' && <div>
            <label htmlFor={id('expense-type')} className={labelClass}>סוג הוצאה</label>
            <select id={id('expense-type')} value={expenseType} onChange={event => setExpenseType(event.target.value as 'fixed' | 'variable')} className={fieldClass}>
              <option value="variable">משתנה</option><option value="fixed">קבועה</option>
            </select>
          </div>}
          <div>
            <label htmlFor={id('payment')} className={labelClass}>{type === 'expense' ? 'אמצעי תשלום' : 'אופן קבלה'}</label>
            <select id={id('payment')} value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as 'bank' | 'cash' | 'credit')} className={fieldClass}>
              <option value="bank">חשבון בנק</option><option value="credit">כרטיס אשראי</option><option value="cash">מזומן</option>
            </select>
          </div>
        </div>
        {paymentMethod === 'credit' && <div>
          <label htmlFor={id('settlement')} className={labelClass}>מועד החיוב בבנק (אם ידוע)</label>
          <input id={id('settlement')} type="date" value={cashflowDate} min={date} onChange={event => setCashflowDate(event.target.value)} className={fieldClass} />
          <p className="text-xs text-muted mt-1">התזרים ישתמש במועד ירידת הכסף מהבנק. מועד לא ידוע יוצג כהתחייבות שדורשת בדיקה.</p>
        </div>}
        {type === 'expense' && expenseType === 'fixed' && <p className="text-xs text-muted">הסיווג לא יוצר חיוב חוזר. להוצאה חודשית חוזרת אפשר להגדיר הוראת קבע בהגדרות.</p>}
        {status === 'posted' && <label className="flex items-start gap-2 text-sm text-muted cursor-pointer"><input type="checkbox" checked={balanceIncluded} onChange={event => setBalanceIncluded(event.target.checked)} className="mt-1 accent-primary" /><span>התנועה כבר כלולה ביתרה שהוזנה</span></label>}
        {error && <p role="alert" className="text-sm text-expense">{error}</p>}
        <Button type="submit" fullWidth>{initialTransaction ? 'שמירת שינויים' : status === 'planned' ? 'שמירת עסקה מתוכננת' : 'שמירת עסקה'}</Button>
      </form>
    </ModalShell>
  );
};
