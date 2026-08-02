import React, { useState } from 'react';
import { Transaction } from '../types';
import { categorize, ALL_CATS } from '../utils/categories';
import { X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { ModalShell } from './ModalShell';

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
  const activeCat = customCat
    ? ALL_CATS.find((c) => c.cat === customCat) || autoCat
    : autoCat;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = parseFloat(amount);
    if (isNaN(raw) || raw <= 0) return;

    const finalAmount = type === 'expense' ? -Math.abs(raw) : Math.abs(raw);
    const catDetails = activeCat || { cat: 'אחר', color: '#9CA3AF', emoji: '📦' };

    const newTx: Transaction = {
      id: Date.now() + Math.random(),
      description: desc.trim() || (type === 'expense' ? 'הוצאה' : 'הכנסה'),
      amount: Math.round(finalAmount * 100) / 100,
      date,
      cat: catDetails.cat,
      color: catDetails.color,
      emoji: catDetails.emoji,
      account: 'ידני',
    };

    onAdd(newTx);
    onClose();
  };

  return (
    <ModalShell onClose={onClose} ariaLabel="הוספת עסקה חדשה" panelClassName="space-y-5 text-right">
        {/* Header */}
        <div className="flex justify-between items-center gap-3 pb-2 border-b border-slate-800">
          <button
            onClick={onClose}
            className="w-8 h-8 shrink-0 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="min-w-0 truncate text-lg font-bold text-white">הוספת עסקה חדשה</h3>
        </div>

        {/* Expense vs Income Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              type === 'expense'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>הוצאה</span>
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              type === 'income'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>הכנסה</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">תיאור העסקה</label>
            <input
              type="text"
              value={desc}
              onChange={(e) => {
                setDesc(e.target.value);
                setCustomCat(null);
              }}
              placeholder="שופרסל, וולט, דלק, ארנונה..."
              required
              autoFocus
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none text-right"
            />
            {activeCat && (
              <div className="mt-1.5 flex min-w-0 items-center gap-2 text-xs">
                <span className="shrink-0 text-slate-400">קטגוריה שזוהתה:</span>
                <span
                  className="min-w-0 truncate px-2 py-0.5 rounded-lg text-xs font-bold"
                  style={{ backgroundColor: activeCat.color + '25', color: activeCat.color }}
                >
                  {activeCat.emoji} {activeCat.cat}
                </span>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">סכום (₪)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none font-num text-right"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">תאריך</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none font-num text-right"
            />
          </div>

          {/* Category Selector Override */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">שנה קטגוריה (אופציונלי)</label>
            <select
              value={activeCat ? activeCat.cat : ''}
              onChange={(e) => setCustomCat(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-300 text-xs outline-none text-right cursor-pointer"
            >
              {ALL_CATS.map((c) => (
                <option key={c.cat} value={c.cat}>
                  {c.emoji} {c.cat}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer mt-2"
          >
            הוסף עסקה ✓
          </button>
        </form>
    </ModalShell>
  );
};
