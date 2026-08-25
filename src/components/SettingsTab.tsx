import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserProfile, BudgetPlanItem, UserAccount, StandingOrder } from '../types';
import { DEFAULT_BUDGET_PLAN, CATEGORIES } from '../utils/categories';
import { generateGeminiContentClient } from '../utils/apiFallback';
import { fmtILS } from '../utils/formatters';
import { Card, SectionTitle, Button, ProgressBar, showToast, showToastError } from './ui';
import { User, LogOut, Download, Upload, CheckCircle2, Key, Sparkles, Eye, EyeOff, Plus, Trash2, Edit2, X, RefreshCw, PieChart } from 'lucide-react';

const CAT_OPTIONS = Object.entries(CATEGORIES).filter(([k]) => k !== 'הכנסה').map(([k, v]) => ({ key: k, color: v.color, emoji: v.emoji }));

interface SettingsTabProps {
  profile: UserProfile;
  budgetPlan: BudgetPlanItem[];
  account: UserAccount;
  appData: any;
  standingOrders: StandingOrder[];
  onUpdateProfile: (p: UserProfile) => void;
  onUpdateBudget: (plan: BudgetPlanItem[]) => void;
  onAddStandingOrder: (so: StandingOrder) => void;
  onUpdateStandingOrder: (so: StandingOrder) => void;
  onDeleteStandingOrder: (id: string | number) => void;
  onLogout: () => void;
  onResetData: () => void;
  onImportBackupData: (data: any) => void;
}

const emptyOrder = (): Omit<StandingOrder, 'id'> => ({
  description: '', amount: 0, dayOfMonth: 1, cat: 'חשבונות',
  color: CATEGORIES['חשבונות'].color, emoji: CATEGORIES['חשבונות'].emoji,
  isActive: true, account: 'הוראת קבע',
});

const InputField: React.FC<{ label: string; value: any; onChange: (v: any) => void; type?: string; step?: string; min?: string; max?: string; placeholder?: string; className?: string }> = ({ label, value, onChange, type = 'text', ...rest }) => (
  <div>
    <label className="block text-sm font-semibold text-ink mb-1">{label}</label>
    <input type={type} value={value} onChange={e => onChange(type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)} className={`w-full bg-surface border border-line focus:border-primary rounded-xl px-4 py-2.5 text-sm text-ink outline-none text-right font-num ${rest.className || ''}`} {...rest} />
  </div>
);

export const SettingsTab: React.FC<SettingsTabProps> = ({
  profile, budgetPlan, account, appData, standingOrders,
  onUpdateProfile, onUpdateBudget, onAddStandingOrder, onUpdateStandingOrder,
  onDeleteStandingOrder, onLogout, onResetData, onImportBackupData,
}) => {
  const [p, setP] = useState<UserProfile>({ ...profile });
  const [bPlan, setBPlan] = useState<BudgetPlanItem[]>(budgetPlan.length ? [...budgetPlan] : DEFAULT_BUDGET_PLAN);
  const [savedMsg, setSavedMsg] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => localStorage.getItem('fil_gemini_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingKey, setTestingKey] = useState(false);
  const [soForm, setSoForm] = useState<Omit<StandingOrder, 'id'> | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const handleSaveGeminiKey = (e: React.FormEvent) => { e.preventDefault(); const t = geminiKeyInput.trim(); if (t) localStorage.setItem('fil_gemini_api_key', t); else localStorage.removeItem('fil_gemini_api_key'); showToast('המפתח נשמר ✓', 'success'); };

  const handleTestGeminiKey = async () => {
    setTestingKey(true); setTestResult(null);
    const key = geminiKeyInput.trim() || localStorage.getItem('fil_gemini_api_key') || '';
    if (!key) { setTestResult({ success: false, message: 'הזן מפתח API' }); setTestingKey(false); return; }
    try {
      const text = await generateGeminiContentClient(key, [{ role: 'user', parts: [{ text: 'תגיב במילה אחת: OK' }] }]);
      setTestResult(text?.toLowerCase().includes('ok') ? { success: true, message: 'מפתח תקין ✓' } : { success: false, message: 'תשובה לא תקינה' });
    } catch (err: any) { setTestResult({ success: false, message: err.message || 'שגיאה' }); }
    finally { setTestingKey(false); }
  };

  const totalPct = bPlan.reduce((s, i) => s + i.pct, 0);
  const isBudgetValid = totalPct === 100;

  const handleProfileSave = (e: React.FormEvent) => { e.preventDefault(); onUpdateProfile(p); setSavedMsg(true); showToast('הפרופיל נשמר ✓', 'success'); setTimeout(() => setSavedMsg(false), 2500); };
  const handleBudgetChange = (key: string, v: number) => setBPlan(bPlan.map(i => i.key === key ? { ...i, pct: Math.max(0, Math.min(100, v)) } : i));
  const handleBudgetSave = () => { if (!isBudgetValid) return; onUpdateBudget(bPlan); showToast('התקציב נשמר ✓', 'success'); };

  const gross = p.grossSalary || 0;
  const kerenDed = p.hasKeren && gross > 0 ? Math.round(gross * (p.kerenEmp || 0) / 100) : 0;
  const pensionDed = p.hasPension && gross > 0 ? Math.round(gross * (p.pensionEmp || 0) / 100) : 0;
  const totalDed = kerenDed + pensionDed + (p.bituahLeumi || 0) + (p.masHachnasa || 0);
  const impliedNet = gross > 0 ? gross - totalDed : 0;

  const exportBackupJSON = () => {
    const blob = new Blob([JSON.stringify({ ...appData, exportDate: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
    a.setAttribute('download', 'FinanceIL_Backup_' + account.username + '.json');
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const importBackupJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { try { const d = JSON.parse(ev.target?.result as string); if (d.profile || d.transactions) { onImportBackupData(d); showToast('הנתונים שוחזרו ✓', 'success'); } } catch { showToastError('קובץ לא תקין'); } };
    reader.readAsText(file);
  };

  const openAddForm = () => { setEditingId(null); setSoForm(emptyOrder()); };
  const openEditForm = (so: StandingOrder) => { setEditingId(so.id); setSoForm({ description: so.description, amount: so.amount, dayOfMonth: so.dayOfMonth, cat: so.cat, color: so.color, emoji: so.emoji, isActive: so.isActive, account: so.account }); };
  const handleSoSubmit = (e: React.FormEvent) => {
    e.preventDefault(); if (!soForm) return;
    if (editingId !== null) onUpdateStandingOrder({ ...soForm, id: editingId });
    else onAddStandingOrder({ ...soForm, id: Date.now() + Math.random() });
    setSoForm(null); setEditingId(null);
  };

  const INPUT = 'w-full bg-surface border border-line focus:border-primary rounded-xl px-4 py-2.5 text-sm text-ink outline-none text-right';
  const INPUT_NUM = INPUT + ' font-num';

  return (
    <div className="space-y-6 pb-24 text-right animate-fade-in">
      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shrink-0">{(account.displayName || account.email || '?')[0]}</div>
            <div className="min-w-0">
              <h3 className="font-bold text-ink text-sm truncate">{account.displayName || account.email}</h3>
              <span className="text-xs text-muted truncate block">{account.email || account.username}</span>
            </div>
          </div>
          <button onClick={onLogout} className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#FF647C]/10 text-expense border border-[#FF647C]/20 text-xs font-bold rounded-xl cursor-pointer hover:bg-[#FF647C]/20 transition-colors">
            <LogOut className="w-4 h-4" /><span>התנתק</span>
          </button>
        </Card>
      </motion.div>

      {savedMsg && <div className="bg-[#00C48C]/10 border border-[#00C48C]/20 text-income p-3 rounded-2xl text-xs font-bold flex items-center justify-between"><span>השינויים נשמרו!</span><CheckCircle2 className="w-4 h-4" /></div>}

      {/* Gemini API Key */}
      <form onSubmit={handleSaveGeminiKey}>
        <SectionTitle title="מפתח Gemini API" action={<span className={`text-[10px] font-bold px-2 py-1 rounded-full ${geminiKeyInput.trim() ? 'bg-[#00C48C]/15 text-income' : 'bg-[#F2C94C]/15 text-[#F2C94C]'}`}><Sparkles className="w-3 h-3 inline" /> {geminiKeyInput.trim() ? 'מוגדר ✓' : 'לא הוגדר'}</span>} />
        <Card className="space-y-3">
          <div className="relative">
            <input type={showKey ? 'text' : 'password'} value={geminiKeyInput} onChange={e => setGeminiKeyInput(e.target.value)} placeholder="AIzaSy..." className={INPUT_NUM + ' pl-10 text-left font-mono'} />
            <button type="button" onClick={() => setShowKey(!showKey)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"><Eye className="w-4 h-4" /></button>
          </div>
          {testResult && <div className={`p-3 rounded-xl text-xs font-bold ${testResult.success ? 'bg-[#00C48C]/10 text-income' : 'bg-[#FF647C]/10 text-expense'}`}>{testResult.message}</div>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleTestGeminiKey} disabled={testingKey} className="h-10 flex-1 text-xs">{testingKey ? 'בודק...' : 'בדוק 🧪'}</Button>
            <Button type="submit" className="h-10 flex-1 text-xs">שמור מפתח ✓</Button>
          </div>
        </Card>
      </form>

      {/* Profile Form */}
      <form onSubmit={handleProfileSave}>
        <SectionTitle title="עריכת פרופיל ושכר" />
        <Card className="space-y-4">
          <InputField label="שם מלא" value={p.name} onChange={(v: string) => setP({ ...p, name: v })} />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="שכר נטו (₪)" type="number" value={p.netSalary} onChange={(v: number) => setP({ ...p, netSalary: v })} />
            <InputField label="שכר ברוטו (₪)" type="number" value={p.grossSalary} onChange={(v: number) => setP({ ...p, grossSalary: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="יום משכורת" type="number" value={p.salaryDay} onChange={(v: number) => setP({ ...p, salaryDay: v })} min="1" max="31" />
            <InputField label="יום חיוב אשראי" type="number" value={p.creditDay} onChange={(v: number) => setP({ ...p, creditDay: v })} min="1" max="31" />
          </div>
          <div className="border-t border-line pt-3 space-y-3">
            <p className="text-sm font-bold text-muted">הפרשות סוציאליות</p>
            <div className="grid grid-cols-2 gap-3">
              <InputField label="ביטוח לאומי (₪)" type="number" value={p.bituahLeumi ?? ''} onChange={(v: number) => setP({ ...p, bituahLeumi: v })} />
              <InputField label="מס הכנסה (₪)" type="number" value={p.masHachnasa ?? ''} onChange={(v: number) => setP({ ...p, masHachnasa: v })} />
            </div>
          </div>
          <div className="border-t border-line pt-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={p.hasKeren} onChange={e => setP(e.target.checked ? { ...p, hasKeren: true, kerenEmp: 2.5, kerenEr: 7.5 } : { ...p, hasKeren: false })} className="accent-primary w-4 h-4" /><span className="text-sm text-ink">קרן השתלמות 💎</span></label>
            {p.hasKeren && <div className="grid grid-cols-2 gap-3">
              <InputField label="עובד (%)" type="number" value={p.kerenEmp} onChange={(v: number) => setP({ ...p, kerenEmp: v })} step="0.1" />
              <InputField label="מעסיק (%)" type="number" value={p.kerenEr} onChange={(v: number) => setP({ ...p, kerenEr: v })} step="0.1" />
            </div>}
          </div>
          <div className="border-t border-line pt-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={p.hasPension} onChange={e => setP(e.target.checked ? { ...p, hasPension: true, pensionEmp: 6, pensionEr: 14.83 } : { ...p, hasPension: false })} className="accent-primary w-4 h-4" /><span className="text-sm text-ink">פנסיה 🏦</span></label>
            {p.hasPension && <div className="grid grid-cols-2 gap-3">
              <InputField label="עובד (%)" type="number" value={p.pensionEmp} onChange={(v: number) => setP({ ...p, pensionEmp: v })} step="0.1" />
              <InputField label="מעסיק (%)" type="number" value={p.pensionEr} onChange={(v: number) => setP({ ...p, pensionEr: v })} step="0.01" />
            </div>}
          </div>
          {gross > 0 && (
            <div className="bg-surface border border-line rounded-2xl p-4 space-y-2 text-sm">
              <p className="font-bold text-ink mb-2">פירוט ניכויים</p>
              <div className="flex justify-between text-muted"><span className="font-num">{fmtILS(gross)}</span><span>ברוטו</span></div>
              {kerenDed > 0 && <div className="flex justify-between text-[#F2C94C]"><span className="font-num">−{fmtILS(kerenDed)}</span><span>קרן השתלמות</span></div>}
              {pensionDed > 0 && <div className="flex justify-between text-secondary"><span className="font-num">−{fmtILS(pensionDed)}</span><span>פנסיה</span></div>}
              <div className="border-t border-line pt-2 flex justify-between font-bold text-income"><span className="font-num">{fmtILS(impliedNet)}</span><span>נטו משוערך</span></div>
            </div>
          )}
          <Button type="submit" fullWidth>שמור פרופיל ✓</Button>
        </Card>
      </form>

      {/* Standing Orders */}
      <div>
        <SectionTitle title="הוראות קבע" action={<button onClick={openAddForm} className="text-xs text-primary font-bold cursor-pointer flex items-center gap-1"><Plus className="w-4 h-4" />הוסף</button>} />
        <Card className="space-y-3">
          {soForm && (
            <form onSubmit={handleSoSubmit} className="bg-surface border border-primary/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between"><p className="text-xs font-bold text-primary">{editingId !== null ? 'עריכת הוראת קבע' : 'הוראת קבע חדשה'}</p><button type="button" onClick={() => { setSoForm(null); setEditingId(null); }} className="text-muted hover:text-ink cursor-pointer"><X className="w-4 h-4" /></button></div>
              <input required type="text" value={soForm.description} onChange={e => setSoForm({ ...soForm, description: e.target.value })} placeholder="תיאור..." className={INPUT} />
              <div className="grid grid-cols-2 gap-3">
                <input required type="number" value={Math.abs(soForm.amount) || ''} onChange={e => setSoForm({ ...soForm, amount: -(parseFloat(e.target.value) || 0) })} placeholder="סכום ₪" className={INPUT_NUM} />
                <input required type="number" min="1" max="31" value={soForm.dayOfMonth} onChange={e => setSoForm({ ...soForm, dayOfMonth: parseInt(e.target.value, 10) || 1 })} className={INPUT_NUM} />
              </div>
              <select value={soForm.cat} onChange={e => { const c = CAT_OPTIONS.find(x => x.key === e.target.value); if (c && soForm) setSoForm({ ...soForm, cat: c.key, color: c.color, emoji: c.emoji }); }} className={INPUT}>
                {CAT_OPTIONS.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.key}</option>)}
              </select>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={soForm.isActive} onChange={e => setSoForm({ ...soForm, isActive: e.target.checked })} className="accent-primary w-4 h-4" /><span className="text-sm text-ink">פעיל</span></label>
                <Button type="submit" className="h-10 px-4 text-xs">{editingId !== null ? 'עדכן' : 'הוסף'} ✓</Button>
              </div>
            </form>
          )}
          {standingOrders.length === 0 && !soForm && <p className="text-muted text-sm text-center py-4">אין הוראות קבע</p>}
          {standingOrders.map(so => (
            <div key={so.id} className={`flex items-center gap-3 p-3 rounded-2xl border mb-2 ${so.isActive ? 'bg-card border-line' : 'bg-surface/50 border-line/50 opacity-50'}`}>
              <span className="text-lg">{so.emoji}</span>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-ink truncate">{so.description}</p><p className="text-xs text-muted">יום {so.dayOfMonth} · {so.cat}</p></div>
              <span dir="ltr" className="text-xs font-bold text-expense font-num">{fmtILS(so.amount)}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => openEditForm(so)} className="p-1.5 rounded-lg bg-surface text-muted hover:text-ink cursor-pointer"><Edit2 className="w-3 h-3" /></button>
                <button onClick={() => onDeleteStandingOrder(so.id)} className="p-1.5 rounded-lg bg-[#FF647C]/10 text-expense cursor-pointer"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Budget Sliders */}
      <div>
        <SectionTitle title="חלוקת אחוזי תקציב" action={<span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isBudgetValid ? 'bg-[#00C48C]/20 text-income' : 'bg-[#FF647C]/20 text-expense'}`}>סה"כ: {totalPct}%</span>} />
        <Card className="space-y-4">
          {bPlan.map(item => (
            <div key={item.key}>
              <div className="flex justify-between items-center text-sm font-semibold mb-1"><span className="text-ink">{item.emoji} {item.key}</span><span className="text-primary font-num">{item.pct}%</span></div>
              <input type="range" min="0" max="60" value={item.pct} onChange={e => handleBudgetChange(item.key, parseInt(e.target.value, 10))} className="w-full accent-primary" />
            </div>
          ))}
          <Button fullWidth onClick={handleBudgetSave} disabled={!isBudgetValid}>שמור תקציב ✓</Button>
        </Card>
      </div>

      {/* Backup */}
      <div>
        <SectionTitle title="גיבוי ושחזור" />
        <Card className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={exportBackupJSON} className="flex items-center justify-center gap-2 py-3 bg-surface border border-line hover:border-primary text-ink text-sm font-bold rounded-xl cursor-pointer"><Download className="w-4 h-4 text-primary" />הורד גיבוי</button>
            <label className="flex items-center justify-center gap-2 py-3 bg-surface border border-line text-ink text-sm font-bold rounded-xl cursor-pointer"><Upload className="w-4 h-4 text-primary" />טען מגיבוי<input type="file" accept=".json" onChange={importBackupJSON} className="hidden" /></label>
          </div>
          <button onClick={() => { if (confirm('לאפס נתונים?')) onResetData(); }} className="w-full py-3 bg-[#FF647C]/10 hover:bg-[#FF647C]/20 text-expense border border-[#FF647C]/20 font-bold text-sm rounded-xl cursor-pointer">איפוס נתונים</button>
        </Card>
      </div>
    </div>
  );
};
