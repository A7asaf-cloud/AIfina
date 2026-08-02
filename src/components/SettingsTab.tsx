import React, { useState } from 'react';
import { UserProfile, BudgetPlanItem, UserAccount, StandingOrder } from '../types';
import { DEFAULT_BUDGET_PLAN, CATEGORIES } from '../utils/categories';
import { generateGeminiContentClient } from '../utils/apiFallback';
import { fmtILS } from '../utils/formatters';
import {
  User,
  PieChart,
  LogOut,
  Download,
  Upload,
  CheckCircle2,
  Key,
  Sparkles,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit2,
  X,
  RefreshCw,
} from 'lucide-react';

const CAT_OPTIONS = Object.entries(CATEGORIES)
  .filter(([k]) => k !== 'הכנסה')
  .map(([k, v]) => ({ key: k, color: (v as any).color, emoji: (v as any).emoji }));

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
  description: '',
  amount: 0,
  dayOfMonth: 1,
  cat: 'חשבונות',
  color: CATEGORIES['חשבונות'].color,
  emoji: CATEGORIES['חשבונות'].emoji,
  isActive: true,
  account: 'הוראת קבע',
});

export const SettingsTab: React.FC<SettingsTabProps> = ({
  profile,
  budgetPlan,
  account,
  appData,
  standingOrders,
  onUpdateProfile,
  onUpdateBudget,
  onAddStandingOrder,
  onUpdateStandingOrder,
  onDeleteStandingOrder,
  onLogout,
  onResetData,
  onImportBackupData,
}) => {
  const [p, setP] = useState<UserProfile>({ ...profile });
  const [bPlan, setBPlan] = useState<BudgetPlanItem[]>(
    budgetPlan && budgetPlan.length ? [...budgetPlan] : DEFAULT_BUDGET_PLAN
  );
  const [savedMsg, setSavedMsg] = useState(false);

  const [geminiKeyInput, setGeminiKeyInput] = useState(() => localStorage.getItem('fil_gemini_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [keySavedToast, setKeySavedToast] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [soForm, setSoForm] = useState<Omit<StandingOrder, 'id'> | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const handleSaveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = geminiKeyInput.trim();
    if (trimmed) localStorage.setItem('fil_gemini_api_key', trimmed);
    else localStorage.removeItem('fil_gemini_api_key');
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 3000);
  };

  const handleTestGeminiKey = async () => {
    setTestingKey(true);
    setTestResult(null);
    const keyToTest = geminiKeyInput.trim() || localStorage.getItem('fil_gemini_api_key') || '';
    if (!keyToTest) { setTestResult({ success: false, message: 'אנא הזן מפתח Gemini API לפני הבדיקה' }); setTestingKey(false); return; }
    try {
      const text = await generateGeminiContentClient(keyToTest, [{ role: 'user', parts: [{ text: 'תגיב במילה אחת: OK' }] }]);
      setTestResult(text && text.toLowerCase().includes('ok')
        ? { success: true, message: 'מפתח ה-Gemini API תקין ופעיל!' }
        : { success: false, message: 'תשובה לא תקינה מה-API' });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'שגיאה' });
    } finally { setTestingKey(false); }
  };

  const totalPct = bPlan.reduce((sum, item) => sum + item.pct, 0);
  const isBudgetValid = totalPct === 100;

  const handleProfileSave = (e: React.FormEvent) => { e.preventDefault(); onUpdateProfile(p); setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2500); };
  const handleBudgetChange = (key: string, newPct: number) => {
    const clamped = Math.max(0, Math.min(100, newPct));
    setBPlan(bPlan.map((item) => item.key === key ? { ...item, pct: clamped } : item));
  };
  const handleBudgetSave = () => { if (!isBudgetValid) return; onUpdateBudget(bPlan); setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2500); };

  const exportBackupJSON = () => {
    const blob = new Blob([JSON.stringify({ ...appData, exportDate: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.setAttribute('download', 'FinanceIL_Backup_' + account.username + '.json');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const importBackupJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.profile || parsed.transactions) { onImportBackupData(parsed); alert('הנתונים שוחזרו בהצלחה!'); }
      } catch { alert('קובץ גיבוי לא תקין'); }
    };
    reader.readAsText(file);
  };

  const gross = p.grossSalary || 0;
  const kerenDeduction = p.hasKeren && gross > 0 ? Math.round(gross * (p.kerenEmp || 0) / 100) : 0;
  const pensionDeduction = p.hasPension && gross > 0 ? Math.round(gross * (p.pensionEmp || 0) / 100) : 0;
  const bituahDeduction = p.bituahLeumi || 0;
  const masDeduction = p.masHachnasa || 0;
  const totalDeductions = kerenDeduction + pensionDeduction + bituahDeduction + masDeduction;
  const impliedNet = gross > 0 ? gross - totalDeductions : 0;

  const openAddForm = () => { setEditingId(null); setSoForm(emptyOrder()); };
  const openEditForm = (so: StandingOrder) => {
    setEditingId(so.id);
    setSoForm({ description: so.description, amount: so.amount, dayOfMonth: so.dayOfMonth, cat: so.cat, color: so.color, emoji: so.emoji, isActive: so.isActive, account: so.account });
  };
  const cancelForm = () => { setSoForm(null); setEditingId(null); };
  const handleSoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!soForm) return;
    if (editingId !== null) onUpdateStandingOrder({ ...soForm, id: editingId });
    else onAddStandingOrder({ ...soForm, id: Date.now() + Math.random() });
    setSoForm(null); setEditingId(null);
  };
  const handleSoCatChange = (cat: string) => {
    const found = CAT_OPTIONS.find((c) => c.key === cat);
    if (found && soForm) setSoForm({ ...soForm, cat, color: found.color, emoji: found.emoji });
  };
  return (
    <div className="space-y-6 pb-24 text-right animate-fade-in">

      {/* User Session Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg shrink-0">👤</div>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-sm truncate">{account.displayName || account.email || account.username}</h3>
            <span className="text-xs text-slate-400 truncate block">{account.email || account.username}</span>
          </div>
        </div>
        <button onClick={onLogout} className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer">
          <LogOut className="w-4 h-4" /><span>יציאה</span>
        </button>
      </div>

      {savedMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-2xl text-xs font-bold flex items-center justify-between">
          <span>השינויים נשמרו בהצלחה!</span><CheckCircle2 className="w-4 h-4" />
        </div>
      )}

      {/* Gemini API Key */}
      <form onSubmit={handleSaveGeminiKey} className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap-reverse items-center justify-between gap-2">
          <span className={"shrink-0 text-[10px] font-extrabold px-2 py-1 rounded-full flex items-center gap-1 border " + (geminiKeyInput.trim() ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30")}>
            <Sparkles className="w-3 h-3" /><span>{geminiKeyInput.trim() ? 'מוגדר ✓' : 'לא הוגדר'}</span>
          </span>
          <h3 className="font-bold text-white text-sm flex items-center gap-1.5"><Key className="w-4 h-4 text-indigo-400 shrink-0" /><span>מפתח Gemini API</span></h3>
        </div>
        {keySavedToast && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2.5 rounded-xl text-xs font-bold flex items-center justify-between"><span>המפתח נשמר!</span><CheckCircle2 className="w-4 h-4" /></div>}
        {testResult && (
          <div className={"p-3 rounded-xl text-xs font-bold flex items-center justify-between " + (testResult.success ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300" : "bg-red-500/15 border border-red-500/30 text-red-300")}>
            <span>{testResult.message}</span>{testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <span>❌</span>}
          </div>
        )}
        <div className="relative">
          <input type={showKey ? 'text' : 'password'} value={geminiKeyInput} onChange={(e) => setGeminiKeyInput(e.target.value)} placeholder="AIzaSy..." className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 pl-10 text-white text-sm outline-none font-mono text-left" />
          <button type="button" onClick={() => setShowKey(!showKey)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleTestGeminiKey} disabled={testingKey} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-all disabled:opacity-50">{testingKey ? 'בודק...' : 'בדוק 🧪'}</button>
          <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl cursor-pointer">שמור מפתח ✓</button>
        </div>
      </form>

      {/* Profile Form */}
      <form onSubmit={handleProfileSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2"><span>עריכת פרופיל ושכר</span><User className="w-4 h-4 text-emerald-400" /></h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">שם מלא</label>
            <input type="text" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none text-right" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">שכר נטו (₪)</label>
              <input type="number" value={p.netSalary} onChange={(e) => setP({ ...p, netSalary: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none font-num text-right" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">שכר ברוטו (₪)</label>
              <input type="number" value={p.grossSalary} onChange={(e) => setP({ ...p, grossSalary: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none font-num text-right" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-emerald-400 mb-1">יום משכורת</label>
              <input type="number" min="1" max="31" value={p.salaryDay} onChange={(e) => setP({ ...p, salaryDay: parseInt(e.target.value, 10) || 10 })} className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none font-num text-right" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-red-400 mb-1">יום חיוב אשראי</label>
              <input type="number" min="1" max="31" value={p.creditDay} onChange={(e) => setP({ ...p, creditDay: parseInt(e.target.value, 10) || 1 })} className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none font-num text-right" />
            </div>
          </div>

          {/* Social Deductions */}
          <div className="border-t border-slate-800 pt-3 space-y-3">
            <p className="text-xs font-bold text-slate-400">הפרשות סוציאליות (ניכויים מהברוטו)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ביטוח לאומי עובד (₪)</label>
                <input type="number" min="0" value={p.bituahLeumi ?? ''} onChange={(e) => setP({ ...p, bituahLeumi: parseFloat(e.target.value) || 0 })} placeholder="0" className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none font-num text-right" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">מס הכנסה (₪)</label>
                <input type="number" min="0" value={p.masHachnasa ?? ''} onChange={(e) => setP({ ...p, masHachnasa: parseFloat(e.target.value) || 0 })} placeholder="0" className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none font-num text-right" />
              </div>
            </div>
          </div>

          {/* Gross Breakdown */}
          {gross > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
              <p className="font-bold text-slate-300 mb-3">פירוט ניכויים מהברוטו</p>
              <div className="flex justify-between text-slate-400"><span className="font-num">{fmtILS(gross)}</span><span>שכר ברוטו</span></div>
              {kerenDeduction > 0 && <div className="flex justify-between text-amber-400"><span className="font-num">−{fmtILS(kerenDeduction)}</span><span>קרן השתלמות עובד ({p.kerenEmp}%)</span></div>}
              {pensionDeduction > 0 && <div className="flex justify-between text-purple-400"><span className="font-num">−{fmtILS(pensionDeduction)}</span><span>פנסיה עובד ({p.pensionEmp}%)</span></div>}
              {bituahDeduction > 0 && <div className="flex justify-between text-blue-400"><span className="font-num">−{fmtILS(bituahDeduction)}</span><span>ביטוח לאומי</span></div>}
              {masDeduction > 0 && <div className="flex justify-between text-red-400"><span className="font-num">−{fmtILS(masDeduction)}</span><span>מס הכנסה</span></div>}
              <div className="border-t border-slate-700 pt-2 flex justify-between font-bold text-emerald-400">
                <span className="font-num">{fmtILS(impliedNet)}</span><span>נטו משוערך</span>
              </div>
              {p.netSalary > 0 && Math.abs(impliedNet - p.netSalary) > 50 && (
                <p className="text-amber-400/80 text-[10px] mt-1">שים לב: נטו משוערך ({fmtILS(impliedNet)}) שונה מהנטו שהוזן ({fmtILS(p.netSalary)})</p>
              )}
            </div>
          )}
        </div>
        <button type="submit" className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all mt-2">שמור עדכוני פרופיל ✓</button>
      </form>

      {/* Standing Orders */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={openAddForm} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-xl cursor-pointer">
            <Plus className="w-4 h-4" /><span>הוסף</span>
          </button>
          <h3 className="font-bold text-white text-base flex items-center gap-2"><span>הוראות קבע</span><RefreshCw className="w-4 h-4 text-emerald-400" /></h3>
        </div>
        {soForm && (
          <form onSubmit={handleSoSubmit} className="bg-slate-950 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <button type="button" onClick={cancelForm} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              <p className="text-xs font-bold text-emerald-400">{editingId !== null ? 'עריכת הוראת קבע' : 'הוראת קבע חדשה'}</p>
            </div>
            <input required type="text" value={soForm.description} onChange={(e) => setSoForm({ ...soForm, description: e.target.value })} placeholder="שכר דירה, חשמל..." className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none text-right" />
            <div className="grid grid-cols-2 gap-3">
              <input required type="number" value={Math.abs(soForm.amount) || ''} onChange={(e) => setSoForm({ ...soForm, amount: -(parseFloat(e.target.value) || 0) })} placeholder="סכום ₪" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none font-num text-right" />
              <input required type="number" min="1" max="31" value={soForm.dayOfMonth} onChange={(e) => setSoForm({ ...soForm, dayOfMonth: parseInt(e.target.value, 10) || 1 })} placeholder="יום" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none font-num text-right" />
            </div>
            <select value={soForm.cat} onChange={(e) => handleSoCatChange(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none text-right">
              {CAT_OPTIONS.map((c) => (<option key={c.key} value={c.key}>{c.emoji} {c.key}</option>))}
            </select>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={soForm.isActive} onChange={(e) => setSoForm({ ...soForm, isActive: e.target.checked })} className="accent-emerald-500 w-4 h-4" />
                <span className="text-xs text-slate-300">פעיל</span>
              </label>
              <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl cursor-pointer">{editingId !== null ? 'עדכן' : 'הוסף'} ✓</button>
            </div>
          </form>
        )}
        {standingOrders.length === 0 && !soForm && <p className="text-slate-500 text-xs text-center py-4">אין הוראות קבע. לחץ "הוסף" ליצירת הראשונה.</p>}
        <div className="space-y-2">
          {standingOrders.map((so) => (
            <div key={so.id} className={"flex items-center gap-3 p-3 rounded-2xl border " + (so.isActive ? "bg-slate-950 border-slate-800" : "bg-slate-950/40 border-slate-800/40 opacity-50")}>
              <span className="text-lg shrink-0">{so.emoji}</span>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-xs font-bold text-white truncate">{so.description}</p>
                <p className="text-[10px] text-slate-400">יום {so.dayOfMonth} · {so.cat}</p>
              </div>
              <span className="text-xs font-bold text-red-400 font-num shrink-0">{fmtILS(so.amount)}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEditForm(so)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"><Edit2 className="w-3 h-3" /></button>
                <button onClick={() => onDeleteStandingOrder(so.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Budget Sliders */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <span className={"text-xs font-bold font-num px-2.5 py-1 rounded-lg " + (isBudgetValid ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
            סה"כ: {totalPct}% {isBudgetValid ? '✓' : '(חייב 100%)'}
          </span>
          <h3 className="font-bold text-white text-base flex items-center gap-2"><span>חלוקת אחוזי תקציב</span><PieChart className="w-4 h-4 text-emerald-400" /></h3>
        </div>
        <div className="space-y-3 pt-2">
          {bPlan.map((item) => (
            <div key={item.key} className="space-y-1">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-300">{item.emoji} {item.key}</span>
                <span className="text-emerald-400 font-num">{item.pct}%</span>
              </div>
              <input type="range" min="0" max="60" value={item.pct} onChange={(e) => handleBudgetChange(item.key, parseInt(e.target.value, 10))} className="w-full accent-emerald-500 bg-slate-950 h-1.5 rounded-lg cursor-pointer" />
            </div>
          ))}
        </div>
        <button onClick={handleBudgetSave} disabled={!isBudgetValid} className={"w-full py-3 text-slate-950 font-extrabold text-xs rounded-xl cursor-pointer " + (isBudgetValid ? "bg-emerald-500 hover:bg-emerald-400" : "bg-slate-800 text-slate-500 cursor-not-allowed")}>שמור הגדרות תקציב ✓</button>
      </div>

      {/* Backup */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
        <h3 className="font-bold text-white text-base">גיבוי ושחזור נתונים</h3>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button onClick={exportBackupJSON} className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"><Download className="w-4 h-4 text-emerald-400" /><span>הורד גיבוי</span></button>
          <label className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"><Upload className="w-4 h-4 text-blue-400" /><span>טען מגיבוי</span><input type="file" accept=".json" onChange={importBackupJSON} className="hidden" /></label>
        </div>
        <button onClick={() => { if (confirm('לאפס נתונים?')) onResetData(); }} className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs rounded-xl cursor-pointer mt-2">איפוס נתוני חשבון</button>
      </div>
    </div>
  );
};
