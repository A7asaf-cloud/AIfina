import React, { useState } from 'react';
import { Transaction, InvestmentState } from '../types';
import { categorize, ALL_CATS } from '../utils/categories';
import { X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { Button } from './ui';

interface AddTransactionModalProps {
  onClose: () => void;
  onAdd: (tx: Transaction) => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ onClose, onAdd }) => {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customCat, setCustomCat] = useState<string | null>(null);

  const autoCat = desc.length > 1 ? categorize(desc) : null;
  const activeCat = customCat ? ALL_CATS.find(c => c.cat === customCat) || autoCat : autoCat;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = parseFloat(amount);
    if (isNaN(raw) || raw <= 0) return;
    const finalAmount = type === 'expense' ? -Math.abs(raw) : Math.abs(raw);
    const catDetails = activeCat || { cat: 'שונות', color: '#8E9BB5', emoji: '📦' };
    onAdd({
      id: Date.now() + Math.random(),
      description: desc.trim() || (type === 'expense' ? 'הוצאה' : 'הכנסה'),
      amount: Math.round(finalAmount * 100) / 100,
      date,
      cat: catDetails.cat,
      color: catDetails.color,
      emoji: catDetails.emoji,
      account: 'ידני',
    });
    onClose();
  };

  return (
    <ModalShell onClose={onClose} ariaLabel="הוספת עסקה חדשה" panelClassName="space-y-5 text-right">
      <div className="flex justify-between items-center gap-3 pb-2 border-b border-line">
        <button onClick={onClose} className="w-8 h-8 shrink-0 rounded-full bg-surface flex items-center justify-center text-muted hover:text-ink cursor-pointer transition-colors">
          <X className="w-4 h-4" />
        </button>
        <h3 className="min-w-0 truncate text-lg font-bold text-ink">הוספת עסקה חדשה</h3>
      </div>

      <div className="flex bg-surface p-1 rounded-2xl border border-line">
        <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${type === 'expense' ? 'bg-[#FF647C]/15 text-expense border border-[#FF647C]/30' : 'text-muted'}`}>
          <ArrowDownLeft className="w-4 h-4" /><span>הוצאה</span>
        </button>
        <button type="button" onClick={() => setType('income')} className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${type === 'income' ? 'bg-[#00C48C]/15 text-income border border-[#00C48C]/30' : 'text-muted'}`}>
          <ArrowUpRight className="w-4 h-4" /><span>הכנסה</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">תיאור העסקה</label>
          <input type="text" value={desc} onChange={e => { setDesc(e.target.value); setCustomCat(null); }} placeholder="שופרסל, וולט, דלק..." required autoFocus className="w-full bg-surface border border-line focus:border-primary rounded-xl px-4 py-3 text-sm text-ink outline-none text-right" />
          {activeCat && (
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <span className="text-muted">קטגוריה:</span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{ backgroundColor: activeCat.color + '1A', color: activeCat.color }}>{activeCat.emoji} {activeCat.cat}</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">סכום (₪)</label>
          <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required className="w-full bg-surface border border-line focus:border-primary rounded-xl px-4 py-3 text-sm text-ink outline-none font-num text-right" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">תאריך</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-surface border border-line focus:border-primary rounded-xl px-4 py-3 text-sm text-ink outline-none font-num text-right" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">שנה קטגוריה (אופציונלי)</label>
          <select value={activeCat ? activeCat.cat : ''} onChange={e => setCustomCat(e.target.value)} className="w-full bg-surface border border-line focus:border-primary rounded-xl px-3 py-2.5 text-sm text-ink outline-none text-right cursor-pointer">
            {ALL_CATS.map(c => <option key={c.cat} value={c.cat}>{c.emoji} {c.cat}</option>)}
          </select>
        </div>

        <Button type="submit" fullWidth className="mt-2">הוסף עסקה ✓</Button>
      </form>
    </ModalShell>
  );
};
