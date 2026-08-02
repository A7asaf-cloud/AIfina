import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { ALL_CATS } from '../utils/categories';
import { fmtILS, fmtDate } from '../utils/formatters';
import { AddTransactionModal } from './AddTransactionModal';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  Edit2,
} from 'lucide-react';

interface TransactionsTabProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string | number) => void;
  onUpdateCategory: (id: string | number, newCat: string) => void;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  onUpdateCategory,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | number | null>(null);

  const filtered = useMemo(() => {
    let list = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.cat.toLowerCase().includes(q)
      );
    }

    if (typeFilter === 'income') list = list.filter((t) => t.amount > 0);
    if (typeFilter === 'expense') list = list.filter((t) => t.amount < 0);

    if (selectedCat !== 'all') {
      list = list.filter((t) => t.cat === selectedCat);
    }

    return list;
  }, [transactions, search, typeFilter, selectedCat]);

  const exportCSV = () => {
    const headers = ['תאריך', 'תיאור', 'קטגוריה', 'סכום'];
    const rows = filtered.map((t) => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.cat,
      t.amount,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dוח_עסקאות_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-32 text-right animate-fade-in">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 חפש עסקאות, בית עסק, קטגוריה..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none text-right"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <div className="flex gap-1.5 flex-shrink-0">
            {(
              [
                ['all', 'הכל'],
                ['income', 'הכנסות'],
                ['expense', 'הוצאות'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTypeFilter(val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  typeFilter === val
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ייצוא CSV</span>
          </button>
        </div>

        {/* Count & Category Select */}
        <div className="flex justify-between items-center gap-3 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
          <span className="min-w-0 truncate">{filtered.length} עסקאות שנמצאו</span>
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="min-w-0 max-w-[55%] bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs outline-none text-right cursor-pointer"
          >
            <option value="all">כל הקטגוריות</option>
            {ALL_CATS.map((c) => (
              <option key={c.cat} value={c.cat}>
                {c.emoji} {c.cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            לא נמצאו עסקאות תואמות לחיפוש
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filtered.map((tx) => {
              const isIncome = tx.amount > 0;
              const isEditing = editingCatId === tx.id;

              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: tx.color + '20' }}
                    >
                      {tx.emoji}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white truncate">
                        {tx.description}
                      </div>

                      <div className="flex min-w-0 items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="shrink-0">{fmtDate(tx.date)}</span>

                        {isEditing ? (
                          <select
                            autoFocus
                            onBlur={() => setEditingCatId(null)}
                            onChange={(e) => {
                              onUpdateCategory(tx.id, e.target.value);
                              setEditingCatId(null);
                            }}
                            defaultValue={tx.cat}
                            className="bg-slate-950 border border-emerald-500 text-emerald-400 rounded px-1.5 py-0.5 text-[11px] font-bold outline-none"
                          >
                            {ALL_CATS.map((c) => (
                              <option key={c.cat} value={c.cat}>
                                {c.emoji} {c.cat}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => setEditingCatId(tx.id)}
                            title="לחץ לשינוי קטגוריה"
                            className="min-w-0 max-w-28 truncate px-1.5 py-0.5 rounded text-[10px] font-bold transition-opacity hover:opacity-80 cursor-pointer"
                            style={{
                              backgroundColor: tx.color + '20',
                              color: tx.color,
                            }}
                          >
                            {tx.cat} ✎
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div
                      className={`text-sm font-bold font-num ${
                        isIncome ? 'text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      {isIncome ? '+' : ''}
                      {fmtILS(tx.amount)}
                    </div>

                    <button
                      onClick={() => onDeleteTransaction(tx.id)}
                      title="מחק עסקה"
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-5 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xl shadow-emerald-500/30 flex items-center justify-center font-black text-2xl z-40 transition-transform active:scale-95 cursor-pointer"
      >
        <Plus className="w-7 h-7" />
      </button>

      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onAdd={onAddTransaction}
        />
      )}
    </div>
  );
};
