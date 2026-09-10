import React, { useState, useMemo } from 'react';
import { Transaction, InvestmentState } from '../types';
import { ALL_CATS } from '../utils/categories';
import { fmtILS, fmtDate, dayLabelHe } from '../utils/formatters';
import { AddTransactionModal } from './AddTransactionModal';
import { ImportTab } from './ImportTab';
import { ModalShell } from './ModalShell';
import { Card, Button } from './ui';
import { Search, Plus, Trash2, Download, Upload, X, Pencil, Check, Ban } from 'lucide-react';

interface TransactionsTabProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string | number) => void;
  onUpdateCategory: (id: string | number, newCat: string) => void;
  onImportTransactions: (txs: Transaction[]) => void;
  onUpdateInvestment: (partial: Partial<InvestmentState>) => void;
  onUpdateTransaction?: (tx: Transaction) => void;
}

const todayLocal = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const transactionStatus = (tx: Transaction) => tx.status || (tx.date > todayLocal() ? 'planned' : 'posted');
const statusLabel = { posted: 'בוצעה', planned: 'מתוכננת', pending: 'ממתינה', cancelled: 'בוטלה' };

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions, onAddTransaction, onDeleteTransaction, onUpdateCategory,
  onImportTransactions, onUpdateInvestment, onUpdateTransaction,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | number | null>(null);
  const [editingTxId, setEditingTxId] = useState<string | number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'posted' | 'planned' | 'cancelled'>('all');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const filtered = useMemo(() => {
    let list = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(t => t.description.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q)); }
    if (typeFilter === 'income') list = list.filter(t => t.amount > 0);
    if (typeFilter === 'expense') list = list.filter(t => t.amount < 0);
    if (selectedCat !== 'all') list = list.filter(t => t.cat === selectedCat);
    if (statusFilter !== 'all') list = list.filter(t => statusFilter === 'planned' ? ['planned', 'pending'].includes(transactionStatus(t)) : transactionStatus(t) === statusFilter);
    return list;
  }, [transactions, search, typeFilter, selectedCat, statusFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filtered.forEach(tx => {
      const key = new Date(`${tx.date}T12:00:00`).toDateString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    return groups as Record<string, Transaction[]>;
  }, [filtered]);

  const postedTransactions = filtered.filter(t => transactionStatus(t) === 'posted' && t.kind !== 'transfer' && t.kind !== 'credit-settlement');
  const summaryIncome = postedTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const summaryExpense = Math.abs(postedTransactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));

  const exportCSV = () => {
    const headers = ['תאריך', 'תיאור', 'קטגוריה', 'סכום', 'מצב'];
    const rows = filtered.map(t => [t.date, `"${t.description.replace(/"/g, '""')}"`, t.cat, t.amount, statusLabel[transactionStatus(t)]]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `עסקאות_${todayLocal()}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-32 text-right animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-xl font-bold text-ink">עסקאות</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)} className="h-10 px-3 text-xs">
            <Upload className="w-4 h-4" />ייבוא
          </Button>
          <Button variant="outline" onClick={exportCSV} aria-label="ייצוא עסקאות לקובץ" className="h-10 px-3 text-xs">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input aria-label="חיפוש עסקאות" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="חפש עסקאות..." className="w-full bg-card border border-line focus:border-primary rounded-xl pr-10 pl-4 py-2.5 text-sm text-ink outline-none text-right h-11" />
      </div>

      {/* Summary Bar */}
      <Card>
        <p className="text-xs text-muted mb-3">עסקאות שבוצעו בתוצאות הסינון · ללא העברות פנימיות וחיובי אשראי מרוכזים</p>
        <div className="flex justify-between text-center">
          <div><p className="text-xs text-muted">הכנסות</p><p dir="ltr" className="text-sm font-bold text-income font-num">{fmtILS(summaryIncome)}</p></div>
          <div className="border-x border-line px-4"><p className="text-xs text-muted">הוצאות</p><p dir="ltr" className="text-sm font-bold text-expense font-num">{fmtILS(summaryExpense)}</p></div>
          <div><p className="text-xs text-muted">מאזן</p><p dir="ltr" className="text-sm font-bold text-ink font-num">{fmtILS(summaryIncome - summaryExpense)}</p></div>
        </div>
      </Card>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2" aria-label="סינון לפי מצב העסקה">
        {([['all', 'כל המצבים'], ['posted', 'בוצעו'], ['planned', 'מתוכננות'], ['cancelled', 'בוטלו']] as const).map(([value, label]) => (
          <button key={value} onClick={() => setStatusFilter(value)} aria-pressed={statusFilter === value} className={`px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer ${statusFilter === value ? 'bg-ink text-white' : 'bg-card border border-line text-muted'}`}>{label}</button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {([['all', 'הכל'], ['income', 'הכנסות'], ['expense', 'הוצאות']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setTypeFilter(val)} className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${typeFilter === val ? 'bg-primary text-white' : 'bg-card border border-line text-muted'}`}>{label}</button>
        ))}
        {ALL_CATS.map(c => (
          <button key={c.cat} onClick={() => setSelectedCat(selectedCat === c.cat ? 'all' : c.cat)} className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${selectedCat === c.cat ? 'bg-primary text-white' : 'bg-card border border-line text-muted'}`}>{c.emoji} {c.cat}</button>
        ))}
      </div>

      {/* Transaction Groups */}
      {Object.keys(grouped).length === 0 ? (
        <Card><p className="text-center text-muted text-sm py-8">לא נמצאו עסקאות</p></Card>
      ) : (
        (Object.entries(grouped) as [string, Transaction[]][]).map(([dateKey, txs]) => (
          <div key={dateKey}>
            <p className="text-xs text-muted font-semibold mb-2 px-1">— {dayLabelHe(dateKey)} —</p>
            <Card className="!p-0 overflow-hidden">
              {txs.map(tx => {
                const isIncome = tx.amount > 0;
                const isEditingCat = editingTxId === tx.id;
                const txStatus = transactionStatus(tx);
                const isPlanned = txStatus === 'planned' || txStatus === 'pending';
                return (
                  <div key={tx.id} className={`flex flex-wrap items-center justify-between gap-y-2 py-3 px-4 border-b border-line last:border-0 ${txStatus === 'cancelled' ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-xl shrink-0">{tx.emoji}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink truncate">{tx.description}</p>
                        <span className={`inline-flex text-[10px] font-semibold rounded px-1.5 py-0.5 mt-1 ${isPlanned ? 'bg-primary/10 text-primary' : txStatus === 'cancelled' ? 'bg-surface text-muted' : 'bg-income/10 text-income'}`}>{statusLabel[txStatus]}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted">{fmtDate(tx.date)}</span>
                          {isEditingCat ? (
                            <select autoFocus onBlur={() => { setEditingTxId(null); setEditingCatId(null); }} onChange={e => { onUpdateCategory(tx.id, e.target.value); setEditingTxId(null); }} defaultValue={tx.cat} className="bg-surface border border-primary text-primary rounded px-1.5 py-0.5 text-xs font-bold outline-none">
                              {ALL_CATS.map(c => <option key={c.cat} value={c.cat}>{c.emoji} {c.cat}</option>)}
                            </select>
                          ) : (
                            <button onClick={() => { setEditingTxId(tx.id); setEditingCatId(tx.id); }} className="px-1.5 py-0.5 rounded text-xs font-bold hover:opacity-80 cursor-pointer" style={{ backgroundColor: tx.color + '1A', color: tx.color }}>{tx.cat} ✎</button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span dir="ltr" className={`text-sm font-semibold font-num ${isIncome ? 'text-income' : 'text-expense'}`}>{isIncome ? '+' : ''}{fmtILS(tx.amount)}</span>
                      <button aria-label="מחק עסקה" onClick={() => onDeleteTransaction(tx.id)} title="מחק" className="p-1.5 text-muted hover:text-expense rounded-lg transition-colors cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {onUpdateTransaction && txStatus !== 'cancelled' && <div className="w-full flex flex-wrap gap-2 pt-1">
                      <button onClick={() => setEditingTransaction(tx)} aria-label={`עריכת ${tx.description}`} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-surface cursor-pointer"><Pencil size={13} />עריכה</button>
                      {isPlanned && <>
                        <button onClick={() => onUpdateTransaction({ ...tx, status: 'posted', date: todayLocal(), cashflowDate: tx.paymentMethod === 'credit' ? tx.cashflowDate : undefined, balanceIncluded: false })} aria-label={`סימון ${tx.description} כבוצעה`} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-income bg-income/10 cursor-pointer"><Check size={13} />בוצעה היום</button>
                        <button onClick={() => onUpdateTransaction({ ...tx, status: 'cancelled' })} aria-label={`ביטול ${tx.description}`} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-surface cursor-pointer"><Ban size={13} />ביטול תכנון</button>
                      </>}
                    </div>}
                  </div>
                );
              })}
            </Card>
          </div>
        ))
      )}

      {/* FAB */}
      <button aria-label="הוספת עסקה" onClick={() => setShowAddModal(true)} className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-5 w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center z-40 transition-transform active:scale-95 cursor-pointer">
        <Plus className="w-7 h-7" />
      </button>

      {showAddModal && <AddTransactionModal onClose={() => setShowAddModal(false)} onAdd={onAddTransaction} />}
      {editingTransaction && onUpdateTransaction && <AddTransactionModal initialTransaction={editingTransaction} onClose={() => setEditingTransaction(null)} onAdd={onUpdateTransaction} />}
      {showImport && (
        <ModalShell maxWidthClass="sm:max-w-lg" onClose={() => setShowImport(false)} ariaLabel="ייבוא עסקאות" panelClassName="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-ink">ייבוא עסקאות</h3>
            <button onClick={() => setShowImport(false)} className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted hover:text-ink cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <ImportTab onImportTransactions={onImportTransactions} onUpdateInvestment={onUpdateInvestment} />
        </ModalShell>
      )}
    </div>
  );
};
