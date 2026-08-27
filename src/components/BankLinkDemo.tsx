import { useState } from 'react';
import { ArrowRight, Building2, Check, Lock, ShieldCheck, RefreshCw, FileText, CreditCard, ChevronLeft } from 'lucide-react';
import { Button, Card, Spinner, Badge, ProgressBar } from './ui';
import { Transaction } from '../types';
import { DEMO_BANKS, DemoBank, generateDemoTransactions, demoBalance, summarize } from '../utils/bankLinkDemo';
import { fmtILS } from '../utils/formatters';

type Phase = 'bank-list' | 'authorize' | 'loading' | 'preview';

interface BankLinkDemoProps {
  onImportTransactions: (txs: Transaction[]) => void;
  onBack: () => void;
}

export function BankLinkDemo({ onImportTransactions, onBack }: BankLinkDemoProps) {
  const [phase, setPhase] = useState<Phase>('bank-list');
  const [bank, setBank] = useState<DemoBank | null>(null);
  const [progress, setProgress] = useState(0);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [checking, setChecking] = useState(false);
  const [imported, setImported] = useState(false);

  function startConnect(b: DemoBank) {
    setBank(b);
    setPhase('authorize');
  }

  function beginScrape() {
    if (!bank) return;
    setPhase('loading');
    setProgress(0);
    // Simulate connection + fetching
    const steps = [12, 28, 45, 63, 80, 94, 100];
    let i = 0;
    const iv = setInterval(() => {
      setProgress(steps[i]);
      i++;
      if (i >= steps.length) {
        clearInterval(iv);
        const gen = generateDemoTransactions(bank, 61);
        setTxs(gen);
        setPhase('preview');
      }
    }, 220);
  }

  function importTxs() {
    if (!bank) return;
    onImportTransactions(txs);
    setImported(true);
  }

  // ── Bank selection ───────────────────────────────────────────────────────
  if (phase === 'bank-list') {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted hover:text-ink transition-colors cursor-pointer">
          <ArrowRight className="w-4 h-4" /> חזרה
        </button>

        <div className="bg-card rounded-2xl border border-line p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-ink">חיבור חשבון בנק</h2>
              <p className="text-xs text-muted">קריאה בלבד · Open Banking</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
            <Lock className="w-3.5 h-3.5 text-income" /> גישה מאובטחת · אי אפשר לבצע פעולות
            <ShieldCheck className="w-3.5 h-3.5 text-primary mr-1" /> מוצפן מקצה לקצה
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-ink mb-2 px-1">בחר את הבנק / חברת האשראי שלך</h3>
          <div className="space-y-2">
            {DEMO_BANKS.map((b) => (
              <button
                key={b.id}
                onClick={() => startConnect(b)}
                className="w-full flex items-center justify-between p-4 bg-card rounded-2xl border border-line hover:border-primary/40 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: b.color + '1A' }}>
                    {b.logo}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-ink text-sm">{b.name}</p>
                    <p className="text-[11px] text-muted">חיבור · סינכרון יומי</p>
                  </div>
                </div>
                <ChevronLeft className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-muted text-center px-6 leading-relaxed">
          הדגמה — מדמה חיבור Open Banking אמיתי עם נתונים לדוגמה מקומית. לחיבור חי אמיתי נדרש רישיון TPP ושרת.
        </p>
      </div>
    );
  }

  // ── Consent / authorization ──────────────────────────────────────────────
  if (phase === 'authorize' && bank) {
    return (
      <div className="space-y-4">
        <button onClick={() => setPhase('bank-list')} className="flex items-center gap-1 text-sm text-muted hover:text-ink transition-colors cursor-pointer">
          <ArrowRight className="w-4 h-4" /> בחר בנק אחר
        </button>

        <Card className="border-line p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: bank.color + '1A' }}>{bank.logo}</div>
            <div>
              <h2 className="text-base font-extrabold text-ink">{bank.name}</h2>
              <Badge>Open Banking · קריאה בלבד</Badge>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-ink text-sm mb-3">הרשאת גישה</h3>
          <ul className="space-y-2.5">
            {[
              { icon: <FileText className="w-4 h-4" />, t: 'פרטי חשבון', d: 'יתרות וחשבונות' },
              { icon: <CreditCard className="w-4 h-4" />, t: 'עסקאות', d: '60 ימים אחרונים' },
              { icon: <Check className="w-4 h-4" />, t: 'קטגוריזציה', d: 'ניתוח הוצאות' },
            ].map((r, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface text-primary flex items-center justify-center shrink-0">{r.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-ink">{r.t}</p>
                  <p className="text-[11px] text-muted">{r.d}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-start gap-2 text-[11px] text-muted">
            <ShieldCheck className="w-4 h-4 text-income mt-0.5 shrink-0" />
            <span>הבנק לא יראה את הנתונים שלך. הגישה ניתנת רק לאפליקציה, ותוכל להפסיק אותה בכל רגע.</span>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={() => setPhase('bank-list')}>ביטול</Button>
          <Button fullWidth onClick={beginScrape}>אישור והמשך</Button>
        </div>
      </div>
    );
  }

  // ── Loading / connecting ─────────────────────────────────────────────────
  if (phase === 'loading' && bank) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center min-h-[50vh]">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5" style={{ background: bank.color + '1A' }}>{bank.logo}</div>
        <div className="flex items-center gap-3 mb-4">
          <Spinner size="md" />
          <h2 className="text-base font-bold text-ink">מתחבר לחשבון {bank.name}...</h2>
        </div>
        <div className="w-full max-w-xs">
          <ProgressBar value={progress} color="#4A6FFF" heightClass="h-2" />
        </div>
        <p className="text-xs text-muted mt-3 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> חיבור מוצפן · {progress}%
        </p>
      </div>
    );
  }

  // ── Preview ──────────────────────────────────────────────────────────────
  if (phase === 'preview' && bank) {
    const bal = demoBalance(bank);
    const sum = summarize(txs);
    return (
      <div className="space-y-4">
        <button onClick={() => setPhase('bank-list')} className="flex items-center gap-1 text-sm text-muted hover:text-ink transition-colors cursor-pointer">
          <ArrowRight className="w-4 h-4" /> בחר בנק אחר
        </button>

        {/* Summary hero */}
        <div className="rounded-2xl p-5 text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #4A6FFF, #7B95FF)' }}>
          <div className="flex items-center justify-between text-white/90 text-xs mb-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-income inline-block" /> מחובר · {bank.name}</span>
            <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> מסונכרן עכשיו</span>
          </div>
          <p className="text-white/80 text-xs">יתרה יומית</p>
          <p dir="ltr" className="font-black text-3xl mb-1 text-left">{fmtILS(bal)}</p>
          <div className="flex gap-4 mt-3 text-xs text-white/90">
            <div><p className="text-white/70">הכנסות</p><p dir="ltr" className="font-bold">{fmtILS(sum.income)}</p></div>
            <div><p className="text-white/70">הוצאות</p><p dir="ltr" className="font-bold">{fmtILS(sum.expense)}</p></div>
            <div><p className="text-white/70">ממוצע יומי</p><p dir="ltr" className="font-bold">{fmtILS(sum.avgDaily)}</p></div>
          </div>
        </div>

        {/* Top category */}
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-ink text-sm">הקטגוריה המובילה</h3>
            <div>
              <Badge color="#FF9F43">{sum.topCategory.cat}</Badge>
            </div>
          </div>
          <p dir="ltr" className="font-black text-xl text-ink mt-1 text-left">{fmtILS(sum.topCategory.amount)}</p>
        </Card>

        {/* Transactions preview */}
        <div>
          <h3 className="text-sm font-bold text-ink mb-2 px-1">עסקאות שנמצאו ({txs.length})</h3>
          <Card className="!p-0 overflow-hidden">
            {txs.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3 px-4 border-b border-line last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg shrink-0">{t.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{t.description}</p>
                    <p className="text-[11px] text-muted">{t.cat}</p>
                  </div>
                </div>
                <p dir="ltr" className={`font-bold text-sm shrink-0 ${t.amount < 0 ? 'text-expense' : 'text-income'}`}>{fmtILS(t.amount)}</p>
              </div>
            ))}
          </Card>
        </div>

        {checking ? (
          <div className="flex items-center justify-center gap-2 text-sm text-primary font-semibold py-4">
            <Spinner size="sm" /> מייבא עסקאות...
          </div>
        ) : (
          <div className="flex gap-3 pb-2">
            <Button variant="outline" fullWidth onClick={() => { setPhase('loading'); setProgress(0); beginScrape(); }}>טען מחדש</Button>
            <Button fullWidth disabled={imported} onClick={importTxs}>
              {imported ? 'יובא ✅' : `ייבא ${txs.length} עסקאות`}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
