import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { categorize } from '../utils/categories';
import { fmtILS, fmtDate } from '../utils/formatters';
import { getMemToken } from '../auth/AuthContext';
import {
  Building2,
  Plus,
  RefreshCw,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ChevronDown,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Institution {
  id: string;
  company_id: string;
  display_name: string;
  is_active: 0 | 1;
  last_scraped_at: string | null;
  created_at: string;
}

interface ScraperTransaction {
  id: string;
  institution_id: string;
  account_number: string;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  type: string | null;
}

// ── Company catalogue ──────────────────────────────────────────────────────────

interface CompanyDef {
  id: string;
  name: string;
  fields: { key: string; label: string; type: 'text' | 'password' }[];
  otp: boolean;
}

const COMPANIES: CompanyDef[] = [
  {
    id: 'hapoalim',
    name: 'בנק הפועלים',
    fields: [{ key: 'userCode', label: 'קוד משתמש', type: 'text' }, { key: 'password', label: 'סיסמה', type: 'password' }],
    otp: true,
  },
  {
    id: 'leumi',
    name: 'בנק לאומי',
    fields: [{ key: 'username', label: 'שם משתמש', type: 'text' }, { key: 'password', label: 'סיסמה', type: 'password' }],
    otp: false,
  },
  {
    id: 'discount',
    name: 'בנק דיסקונט',
    fields: [
      { key: 'id', label: 'תעודת זהות', type: 'text' },
      { key: 'password', label: 'סיסמה', type: 'password' },
      { key: 'num', label: 'מספר לקוח', type: 'text' },
    ],
    otp: false,
  },
  {
    id: 'mercantile',
    name: 'בנק מרכנתיל',
    fields: [
      { key: 'id', label: 'תעודת זהות', type: 'text' },
      { key: 'password', label: 'סיסמה', type: 'password' },
      { key: 'num', label: 'מספר לקוח', type: 'text' },
    ],
    otp: false,
  },
  {
    id: 'mizrahi',
    name: 'מזרחי-טפחות',
    fields: [{ key: 'username', label: 'שם משתמש', type: 'text' }, { key: 'password', label: 'סיסמה', type: 'password' }],
    otp: false,
  },
  {
    id: 'otsarHahayal',
    name: 'אוצר החייל',
    fields: [{ key: 'username', label: 'שם משתמש', type: 'text' }, { key: 'password', label: 'סיסמה', type: 'password' }],
    otp: false,
  },
  {
    id: 'visaCal',
    name: 'ויזה כאל',
    fields: [{ key: 'username', label: 'שם משתמש', type: 'text' }, { key: 'password', label: 'סיסמה', type: 'password' }],
    otp: false,
  },
  {
    id: 'max',
    name: 'Max (לאומי קארד)',
    fields: [{ key: 'username', label: 'שם משתמש', type: 'text' }, { key: 'password', label: 'סיסמה', type: 'password' }],
    otp: false,
  },
  {
    id: 'isracard',
    name: 'ישראכארט',
    fields: [
      { key: 'id', label: 'תעודת זהות', type: 'text' },
      { key: 'card6Digits', label: '6 ספרות כרטיס', type: 'text' },
      { key: 'password', label: 'סיסמה', type: 'password' },
    ],
    otp: false,
  },
  {
    id: 'amex',
    name: 'אמריקן אקספרס',
    fields: [
      { key: 'username', label: 'שם משתמש', type: 'text' },
      { key: 'card6Digits', label: '6 ספרות כרטיס', type: 'text' },
      { key: 'password', label: 'סיסמה', type: 'password' },
    ],
    otp: false,
  },
  {
    id: 'unionBank',
    name: 'יובנק',
    fields: [{ key: 'username', label: 'שם משתמש', type: 'text' }, { key: 'password', label: 'סיסמה', type: 'password' }],
    otp: false,
  },
  {
    id: 'beinleumi',
    name: 'בינלאומי',
    fields: [{ key: 'username', label: 'שם משתמש', type: 'text' }, { key: 'password', label: 'סיסמה', type: 'password' }],
    otp: true,
  },
  {
    id: 'oneZero',
    name: 'OneZero',
    fields: [{ key: 'email', label: 'אימייל', type: 'text' }, { key: 'password', label: 'סיסמה', type: 'password' }],
    otp: true,
  },
];

// Category mapping from scraper → AIfina
const SCRAPER_CAT_MAP: Record<string, string> = {
  מזון: 'מזון ושוק',
  תחבורה: 'תחבורה',
  בילויים: 'בידור',
  חשבונות: 'חשבונות',
  קניות: 'קניות',
  בריאות: 'בריאות',
  חינוך: 'שונות',
  אחר: 'שונות',
};

function toAppTransaction(t: ScraperTransaction): Transaction {
  const mappedCat = SCRAPER_CAT_MAP[t.category ?? ''] ?? null;
  const catInfo = mappedCat
    ? categorize(t.description) // use keyword fallback to get color/emoji, then override cat
    : categorize(t.description);
  const finalCat = mappedCat ?? catInfo.cat;
  const rule = categorize(t.description);

  return {
    id: t.id,
    description: t.description,
    amount: -Math.abs(t.amount), // scraper amounts are positive expenses
    date: t.date.slice(0, 10),
    cat: finalCat,
    color: rule.color,
    emoji: rule.emoji,
    account: t.account_number,
  };
}

// ── API helper ─────────────────────────────────────────────────────────────────

async function scraperFetch(method: string, path: string, body?: object): Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }> {
  const token = getMemToken();
  const res = await fetch(`/api/scraper${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ── Main component ─────────────────────────────────────────────────────────────

type View = 'list' | 'add' | 'preview';

interface BankScraperProps {
  onImportTransactions: (txs: Transaction[]) => void;
  onBack: () => void;
}

export const BankScraper: React.FC<BankScraperProps> = ({ onImportTransactions, onBack }) => {
  const [view, setView] = useState<View>('list');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Add-institution form
  const [selectedCompany, setSelectedCompany] = useState<CompanyDef | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  // Scraping state
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [otpMode, setOtpMode] = useState<{ sessionId: string; institutionId: string } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // Preview
  const [previewTxs, setPreviewTxs] = useState<Transaction[]>([]);
  const [previewLabel, setPreviewLabel] = useState('');

  useEffect(() => { loadInstitutions(); }, []);

  const loadInstitutions = async () => {
    setLoadingList(true);
    setGlobalError(null);
    try {
      const data = await scraperFetch('GET', '/institutions');
      if (data.success) {
        setInstitutions(data.data as Institution[]);
      } else {
        setGlobalError((data.error as { message?: string })?.message ?? 'שגיאה בטעינת מוסדות');
      }
    } catch {
      setGlobalError('שירות ייבוא הבנק אינו זמין. ודא ש-finance-scraper פועל על פורט 3001.');
    } finally {
      setLoadingList(false);
    }
  };

  const handleAddInstitution = async () => {
    if (!selectedCompany || !displayName) return;
    const missingFields = selectedCompany.fields.filter(f => !credentials[f.key]);
    if (missingFields.length) {
      setAddError(`שדות חסרים: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }
    setAddLoading(true);
    setAddError(null);
    try {
      const data = await scraperFetch('POST', '/institutions', {
        company_id: selectedCompany.id,
        display_name: displayName,
        credentials,
      });
      if (data.success) {
        await loadInstitutions();
        setView('list');
        setSelectedCompany(null);
        setDisplayName('');
        setCredentials({});
      } else {
        setAddError((data.error as { message?: string })?.message ?? 'שגיאה בהוספת חיבור');
      }
    } catch {
      setAddError('שגיאת תקשורת');
    } finally {
      setAddLoading(false);
    }
  };

  const handleScrape = async (inst: Institution) => {
    setScrapingId(inst.id);
    setGlobalError(null);
    try {
      const fromDate = new Date();
      fromDate.setMonth(fromDate.getMonth() - 3);
      const fromStr = fromDate.toISOString().slice(0, 10);

      const data = await scraperFetch('POST', `/scrape/${inst.id}`);
      const result = data.data as { status: string; sessionId?: string; transactionsNew?: number } | undefined;

      if (result?.status === 'otp_required') {
        setOtpMode({ sessionId: result.sessionId!, institutionId: inst.id });
        setScrapingId(null);
        return;
      }

      if (data.success) {
        // Fetch transactions from the last 3 months for this institution
        const txData = await scraperFetch('GET', `/transactions?institution_id=${inst.id}&from=${fromStr}&per_page=200`);
        if (txData.success) {
          const scraperTxs = (txData.data as ScraperTransaction[]).map(toAppTransaction);
          setPreviewTxs(scraperTxs);
          setPreviewLabel(inst.display_name);
          setView('preview');
        } else {
          setGlobalError('שגיאה בטעינת עסקאות');
        }
      } else {
        setGlobalError((data.error as { message?: string })?.message ?? 'שגיאה בסריקה');
      }
    } catch {
      setGlobalError('שגיאת תקשורת עם שירות הסריקה');
    } finally {
      setScrapingId(null);
    }
  };

  const handleOtpSubmit = async () => {
    if (!otpMode || !otpCode) return;
    setOtpLoading(true);
    try {
      const data = await scraperFetch('POST', `/scrape/${otpMode.institutionId}/otp`, {
        sessionId: otpMode.sessionId,
        otpCode,
      });
      if (data.success) {
        setOtpMode(null);
        setOtpCode('');
        const inst = institutions.find(i => i.id === otpMode.institutionId);
        if (inst) await handleScrape(inst);
      } else {
        setGlobalError((data.error as { message?: string })?.message ?? 'קוד OTP שגוי');
        setOtpMode(null);
        setOtpCode('');
      }
    } catch {
      setGlobalError('שגיאת תקשורת');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleToggle = async (inst: Institution) => {
    await scraperFetch('PATCH', `/institutions/${inst.id}/toggle`);
    await loadInstitutions();
  };

  const handleDelete = async (inst: Institution) => {
    if (!confirm(`למחוק את החיבור ל${inst.display_name}? הפעולה בלתי הפיכה.`)) return;
    await scraperFetch('DELETE', `/institutions/${inst.id}`);
    await loadInstitutions();
  };

  const confirmImport = () => {
    onImportTransactions(previewTxs);
    setPreviewTxs([]);
    setView('list');
  };

  // ── OTP overlay ───────────────────────────────────────────────────────────────
  if (otpMode) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 text-right">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">נדרש קוד אימות (OTP)</h3>
            <p className="text-slate-400 text-xs mt-0.5">הבנק שלח SMS עם קוד חד-פעמי</p>
          </div>
        </div>

        <input
          type="text"
          inputMode="numeric"
          maxLength={8}
          value={otpCode}
          onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
          placeholder="הכנס קוד OTP"
          className="w-full bg-slate-950 border border-slate-700 text-white text-center text-2xl font-mono tracking-widest rounded-xl px-4 py-4 outline-none focus:border-amber-500/50"
          autoFocus
        />

        <div className="flex gap-3">
          <button
            onClick={() => { setOtpMode(null); setOtpCode(''); }}
            className="py-3 px-4 bg-slate-800 text-slate-300 font-bold text-sm rounded-xl cursor-pointer"
          >
            ביטול
          </button>
          <button
            onClick={handleOtpSubmit}
            disabled={otpCode.length < 4 || otpLoading}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {otpLoading ? 'שולח...' : 'אמת ומשך עסקאות'}
          </button>
        </div>
      </div>
    );
  }

  // ── Preview view ──────────────────────────────────────────────────────────────
  if (view === 'preview') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 text-right">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <button
            onClick={() => setView('list')}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-bold cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span>חזור</span>
          </button>
          <h3 className="font-bold text-white text-base">{previewLabel}</h3>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl text-emerald-400 text-xs font-bold flex items-center justify-between">
          <span>נמצאו {previewTxs.length} עסקאות (3 חודשים אחרונים)</span>
          <CheckCircle2 className="w-5 h-5" />
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-800 bg-slate-950 p-3 rounded-2xl border border-slate-800">
          {previewTxs.slice(0, 100).map((tx, idx) => (
            <div key={idx} className="py-2 flex justify-between items-center gap-3 text-xs">
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <span className="shrink-0">{tx.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium truncate">{tx.description}</p>
                  <p className="text-slate-500 truncate">{fmtDate(tx.date)} · {tx.cat}</p>
                </div>
              </div>
              <span className={`font-bold shrink-0 mr-2 ${tx.amount > 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                {fmtILS(tx.amount)}
              </span>
            </div>
          ))}
          {previewTxs.length > 100 && (
            <p className="text-center text-slate-500 text-xs py-2">+ עוד {previewTxs.length - 100} עסקאות</p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button
            onClick={() => setView('list')}
            className="py-3 px-4 bg-slate-800 text-slate-300 font-bold text-sm rounded-xl cursor-pointer"
          >
            בטל
          </button>
          <button
            onClick={confirmImport}
            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            ייבא {previewTxs.length} עסקאות לדשבורד ✓
          </button>
        </div>
      </div>
    );
  }

  // ── Add institution view ───────────────────────────────────────────────────────
  if (view === 'add') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 text-right">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <button
            onClick={() => { setView('list'); setSelectedCompany(null); setCredentials({}); setAddError(null); }}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-bold cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span>חזור</span>
          </button>
          <h3 className="font-bold text-white text-base">חיבור מוסד פיננסי חדש</h3>
        </div>

        {/* Security notice */}
        <div className="bg-slate-950 border border-slate-700/50 rounded-2xl p-3 flex items-start gap-2">
          <Lock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <p className="text-slate-400 text-xs leading-relaxed">
            פרטי ההתחברות מוצפנים ב-AES-256 ונשמרים רק בשרת המקומי שלך. הגישה היא קריאה בלבד — לא ניתן לבצע פעולות בנקאיות.
          </p>
        </div>

        {/* Company selector */}
        <div className="relative">
          <label className="text-xs text-slate-400 font-medium block mb-1.5">מוסד פיננסי</label>
          <button
            onClick={() => setShowCompanyDropdown(v => !v)}
            className="w-full bg-slate-950 border border-slate-700 text-right px-4 py-3 rounded-xl flex items-center justify-between text-sm cursor-pointer"
          >
            <span className={`min-w-0 truncate ${selectedCompany ? 'text-white' : 'text-slate-500'}`}>
              {selectedCompany?.name ?? 'בחר בנק / כרטיס אשראי...'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {showCompanyDropdown && (
            <div className="absolute top-full mt-1 right-0 left-0 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden z-40 shadow-xl max-h-56 overflow-y-auto">
              {COMPANIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCompany(c);
                    setCredentials({});
                    setDisplayName(c.name);
                    setShowCompanyDropdown(false);
                  }}
                  className="w-full text-right px-4 py-2.5 text-sm hover:bg-slate-800 text-white flex items-center justify-between cursor-pointer"
                >
                  <span>{c.name}</span>
                  {c.otp && <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">OTP</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedCompany && (
          <>
            {/* Display name */}
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">שם תצוגה</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-emerald-500/50 text-right"
              />
            </div>

            {/* Credential fields */}
            {selectedCompany.fields.map(f => (
              <div key={f.key}>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  value={credentials[f.key] ?? ''}
                  onChange={e => setCredentials(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-emerald-500/50 text-right"
                  autoComplete="off"
                />
              </div>
            ))}

            {selectedCompany.otp && (
              <p className="text-xs text-amber-400/80 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2">
                בנק זה ישלח קוד SMS בזמן הסריקה הראשונה.
              </p>
            )}

            {addError && (
              <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <button
              onClick={handleAddInstitution}
              disabled={addLoading}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-60"
            >
              {addLoading ? 'שומר...' : 'שמור חיבור'}
            </button>
          </>
        )}
      </div>
    );
  }

  // ── List view (default) ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4 text-right">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-bold cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span>חזור</span>
          </button>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-violet-400" />
            <h3 className="font-bold text-white text-base">ייבוא ישיר מהבנק</h3>
          </div>
        </div>

        {globalError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{globalError}</span>
          </div>
        )}

        {loadingList ? (
          <div className="flex items-center justify-center py-10 gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">טוען מוסדות...</span>
          </div>
        ) : institutions.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-16 h-16 rounded-full bg-violet-500/10 text-violet-400 flex items-center justify-center text-3xl mx-auto">
              <Building2 className="w-8 h-8" />
            </div>
            <p className="text-white font-bold text-sm">לא מוגדרים מוסדות פיננסיים</p>
            <p className="text-slate-400 text-xs">הוסף חיבור לבנק או כרטיס אשראי שלך</p>
          </div>
        ) : (
          <div className="space-y-3">
            {institutions.map(inst => (
              <div
                key={inst.id}
                className={`bg-slate-950 border rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors ${
                  inst.is_active ? 'border-slate-800' : 'border-slate-800/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate">{inst.display_name}</p>
                    <p className="text-slate-500 text-[11px]">
                      {inst.last_scraped_at
                        ? `עודכן: ${fmtDate(inst.last_scraped_at.slice(0, 10))}`
                        : 'לא סורק עדיין'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Scrape button */}
                  <button
                    onClick={() => handleScrape(inst)}
                    disabled={scrapingId === inst.id || !inst.is_active}
                    title="משוך עסקאות"
                    className="p-2 hover:bg-slate-800 rounded-xl text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {scrapingId === inst.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <RefreshCw className="w-4 h-4" />}
                  </button>

                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(inst)}
                    title={inst.is_active ? 'השבת' : 'הפעל'}
                    className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {inst.is_active
                      ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                      : <ToggleLeft className="w-4 h-4" />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(inst)}
                    title="מחק"
                    className="p-2 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add button */}
        <button
          onClick={() => { setView('add'); setAddError(null); }}
          className="w-full py-3 border border-dashed border-violet-500/30 hover:border-violet-500/60 hover:bg-violet-500/5 text-violet-400 font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>הוסף בנק / כרטיס אשראי</span>
        </button>
      </div>

      {/* Legal notice */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
        <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-slate-500 text-xs leading-relaxed">
          המערכת מתחברת לאתר הבנק שלך בדפדפן מוסתר (Puppeteer) ומושכת נתוני עסקאות בלבד.
          לא ניתן לבצע שום פעולה — העברות, תשלומים או שינויים. הפרטים מוצפנים ונשמרים רק בשרת המקומי.
        </p>
      </div>
    </div>
  );
};
