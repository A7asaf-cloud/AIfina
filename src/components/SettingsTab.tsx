import React, { useState } from 'react';
import { UserProfile, BudgetPlanItem, UserAccount } from '../types';
import { DEFAULT_BUDGET_PLAN } from '../utils/categories';
import { generateGeminiContentClient, getApiUrl } from '../utils/apiFallback';
import { CONFIG } from '../config';
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
  Database,
} from 'lucide-react';

interface SettingsTabProps {
  profile: UserProfile;
  budgetPlan: BudgetPlanItem[];
  account: UserAccount;
  appData: any;
  onUpdateProfile: (p: UserProfile) => void;
  onUpdateBudget: (plan: BudgetPlanItem[]) => void;
  onLogout: () => void;
  onResetData: () => void;
  onImportBackupData: (data: any) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  profile,
  budgetPlan,
  account,
  appData,
  onUpdateProfile,
  onUpdateBudget,
  onLogout,
  onResetData,
  onImportBackupData,
}) => {
  const [p, setP] = useState<UserProfile>({ ...profile });
  const [bPlan, setBPlan] = useState<BudgetPlanItem[]>(
    budgetPlan && budgetPlan.length ? [...budgetPlan] : DEFAULT_BUDGET_PLAN
  );
  const [savedMsg, setSavedMsg] = useState(false);

  // Gemini API Key State
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => {
    return localStorage.getItem('fil_gemini_api_key') || '';
  });
  const [showKey, setShowKey] = useState(false);
  const [keySavedToast, setKeySavedToast] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSaveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = geminiKeyInput.trim();
    if (trimmed) {
      localStorage.setItem('fil_gemini_api_key', trimmed);
    } else {
      localStorage.removeItem('fil_gemini_api_key');
    }
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 3000);
  };

  // GitHub Sync Token State
  const [githubTokenInput, setGithubTokenInput] = useState(() => {
    return localStorage.getItem('fil_github_token') || '';
  });
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [githubTokenSavedToast, setGithubTokenSavedToast] = useState(false);

  const handleSaveGithubToken = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = githubTokenInput.trim();
    if (trimmed) {
      localStorage.setItem('fil_github_token', trimmed);
    } else {
      localStorage.removeItem('fil_github_token');
    }
    setGithubTokenSavedToast(true);
    setTimeout(() => setGithubTokenSavedToast(false), 3000);
  };



  const handleTestGeminiKey = async () => {
    setTestingKey(true);
    setTestResult(null);
    const keyToTest = geminiKeyInput.trim() || localStorage.getItem('fil_gemini_api_key') || '';
    
    const runClientTest = async () => {
      const text = await generateGeminiContentClient(keyToTest, [
        { role: 'user', parts: [{ text: 'תגיב בעברית במילה אחת בלבד: "OK"' }] }
      ]);
      if (text && text.toLowerCase().includes('ok')) {
        setTestResult({ success: true, message: 'מפתח ה-Gemini API תקין ופעיל ישירות מהדפדפן (מצב אופליין)! 🤖✨' });
      } else {
        setTestResult({ success: false, message: 'התקבלה תשובה לא תקינה מה-API של גוגל' });
      }
    };

    try {
      if (!CONFIG.API_SERVER_URL) {
        await runClientTest();
        return;
      }

      const res = await fetch(getApiUrl('/api/test-ai'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': keyToTest,
        },
        body: JSON.stringify({ geminiApiKey: keyToTest }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTestResult({ success: true, message: data.message || 'המפתח תקין ופעיל!' });
        } else {
          setTestResult({ success: false, message: data.error || 'המפתח אינו תקין' });
        }
      } else {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
    } catch (err: any) {
      // Direct client fallback if server is unreachable
      try {
        await runClientTest();
      } catch (clientErr: any) {
        setTestResult({ success: false, message: clientErr.message || 'שגיאה באימות מפתח ה-Gemini API ישירות מהדפדפן' });
      }
    } finally {
      setTestingKey(false);
    }
  };

  const totalPct = bPlan.reduce((sum, item) => sum + item.pct, 0);
  const isBudgetValid = totalPct === 100;

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(p);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  const handleBudgetChange = (key: string, newPct: number) => {
    const clamped = Math.max(0, Math.min(100, newPct));
    const updated = bPlan.map((item) =>
      item.key === key ? { ...item, pct: clamped } : item
    );
    setBPlan(updated);
  };

  const handleBudgetSave = () => {
    if (!isBudgetValid) return;
    onUpdateBudget(bPlan);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  const exportBackupJSON = () => {
    const fullData = {
      ...appData,
      exportDate: new Date().toISOString(),
    };
    const jsonStr = JSON.stringify(fullData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `FinanceIL_Backup_${account.username}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importBackupJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.profile || parsed.transactions) {
          onImportBackupData(parsed);
          alert('כל הנתונים (פרופיל, תקציב, עסקאות והשקעות) שוחזרו בהצלחה!');
        }
      } catch {
        alert('קובץ גיבוי לא תקין');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-24 text-right animate-fade-in">
      {/* User Session Info Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xl">
            👤
          </div>
          <div>
            <h3 className="font-bold text-white text-base">{account.displayName || account.username}</h3>
            <span className="text-xs text-slate-400 font-num">שם משתמש: {account.username}</span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>התנתק</span>
        </button>
      </div>

      {savedMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-2xl text-xs font-bold flex items-center justify-between animate-fade-in">
          <span>השינויים נשמרו בהצלחה!</span>
          <CheckCircle2 className="w-4 h-4" />
        </div>
      )}

      {/* Gemini API Key Configuration Card */}
      <form onSubmit={handleSaveGeminiKey} className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 border ${
            geminiKeyInput.trim()
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          }`}>
            <Sparkles className="w-3 h-3" />
            <span>{geminiKeyInput.trim() ? 'מפתח מוגדר' : 'טרם הוגדר מפתח'}</span>
          </span>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <span>הגדרת מפתח Gemini API (בינה מלאכותית)</span>
            <Key className="w-4 h-4 text-indigo-400" />
          </h3>
        </div>

        <p className="text-slate-400 text-xs leading-relaxed">
          מפתח Gemini API נדרש לסריקת קבלות, ניתוח דפי בנק וזיהוי מניות מצילומי מסך.
          ניתן להנפיק מפתח בחינם במידי מאתר{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 font-bold underline hover:text-indigo-300"
          >
            Google AI Studio ↗
          </a>
          .
        </p>

        {keySavedToast && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2.5 rounded-xl text-xs font-bold flex items-center justify-between">
            <span>המפתח נשמר בהצלחה בדפדפן!</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
        )}

        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
              testResult.success
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/15 border border-red-500/30 text-red-300'
            }`}
          >
            <span>{testResult.message}</span>
            {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <span>❌</span>}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            מפתח Gemini API אישי
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={geminiKeyInput}
              onChange={(e) => setGeminiKeyInput(e.target.value)}
              placeholder="הדבק כאן מפתח: AIzaSy..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 pl-10 text-white text-sm outline-none font-mono text-left"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleTestGeminiKey}
            disabled={testingKey}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-all disabled:opacity-50"
          >
            {testingKey ? 'בודק מפתח...' : 'בדוק מפתח 🧪'}
          </button>
          <button
            type="submit"
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all"
          >
            שמור מפתח Gemini API ✓
          </button>
        </div>
      </form>

      {/* GitHub Sync Database Configuration */}
      <form onSubmit={handleSaveGithubToken} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <span>סנכרון ענן לחשבון (ריבוי מכשירים)</span>
          <Database className="w-4 h-4 text-emerald-400" />
        </h3>

        <p className="text-slate-400 text-xs leading-relaxed">
          הזן את מפתח הגישה שלך (GitHub Token) כדי לאפשר סנכרון אוטומטי של החשבון והמידע שלך מכל מכשיר (בדומה לאינסטגרם) ללא צורך בהקמת שרת.
        </p>

        {githubTokenSavedToast && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2.5 rounded-xl text-xs font-bold flex items-center justify-between">
            <span>מפתח הסנכרון נשמר בהצלחה!</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            מפתח גישה לסנכרון (GitHub Token)
          </label>
          <div className="relative">
            <input
              type={showGithubToken ? 'text' : 'password'}
              value={githubTokenInput}
              onChange={(e) => setGithubTokenInput(e.target.value)}
              placeholder="הדבק כאן: ghp_..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 pl-10 text-white text-sm outline-none font-mono text-left"
            />
            <button
              type="button"
              onClick={() => setShowGithubToken(!showGithubToken)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showGithubToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all"
        >
          שמור מפתח סנכרון ענן ✓
        </button>
      </form>



      {/* Profile Form */}
      <form onSubmit={handleProfileSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <span>עריכת פרופיל ושכר</span>
          <User className="w-4 h-4 text-emerald-400" />
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">שם מלא</label>
            <input
              type="text"
              value={p.name}
              onChange={(e) => setP({ ...p, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none text-right"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">שכר נטו (₪)</label>
              <input
                type="number"
                value={p.netSalary}
                onChange={(e) => setP({ ...p, netSalary: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none font-num text-right"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">שכר ברוטו (₪)</label>
              <input
                type="number"
                value={p.grossSalary}
                onChange={(e) => setP({ ...p, grossSalary: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none font-num text-right"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-emerald-400 mb-1">יום כניסת משכורת</label>
              <input
                type="number"
                min="1"
                max="31"
                value={p.salaryDay}
                onChange={(e) => setP({ ...p, salaryDay: parseInt(e.target.value, 10) || 10 })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none font-num text-right"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-red-400 mb-1">יום חיוב אשראי</label>
              <input
                type="number"
                min="1"
                max="31"
                value={p.creditDay}
                onChange={(e) => setP({ ...p, creditDay: parseInt(e.target.value, 10) || 1 })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none font-num text-right"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all mt-2"
        >
          שמור עדכוני פרופיל ✓
        </button>
      </form>

      {/* Budget Sliders Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <span
            className={`text-xs font-bold font-num px-2.5 py-1 rounded-lg ${
              isBudgetValid
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            סה"כ: {totalPct}% {isBudgetValid ? '✓' : '(חייב להיות 100%)'}
          </span>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <span>חלוקת אחוזי תקציב</span>
            <PieChart className="w-4 h-4 text-emerald-400" />
          </h3>
        </div>

        <div className="space-y-3 pt-2">
          {bPlan.map((item) => (
            <div key={item.key} className="space-y-1">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-300">
                  {item.emoji} {item.key}
                </span>
                <span className="text-emerald-400 font-num">{item.pct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={item.pct}
                onChange={(e) => handleBudgetChange(item.key, parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleBudgetSave}
          disabled={!isBudgetValid}
          className={`w-full py-3 text-slate-950 font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all mt-2 ${
            isBudgetValid ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          שמור הגדרות תקציב ✓
        </button>
      </div>

      {/* Data Backup & Reset */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
        <h3 className="font-bold text-white text-base">גיבוי ושחזור נתונים</h3>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={exportBackupJSON}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-all"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>הורד גיבוי (JSON)</span>
          </button>

          <label className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-all">
            <Upload className="w-4 h-4 text-blue-400" />
            <span>טען מגיבוי</span>
            <input type="file" accept=".json" onChange={importBackupJSON} className="hidden" />
          </label>
        </div>

        <button
          onClick={() => {
            if (confirm('האם אתה בטוח שברצונך לאפס את הנתונים המקומיים בחשבון זה?')) {
              onResetData();
            }
          }}
          className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs rounded-xl cursor-pointer transition-all mt-2"
        >
          איפוס נתוני חשבון 🗑️
        </button>
      </div>
    </div>
  );
};
