import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, FileSpreadsheet, Landmark, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { getMemToken } from '../auth/AuthContext';
import { getApiUrl } from '../utils/apiFallback';
import { Card } from './ui';

interface IntegrationStatus {
  ai: { configured: boolean; model: string };
  openBanking: { status: 'requires_provider_approval'; provider: 'Feezback'; documentationUrl: string };
  imports: { available: boolean };
}

function parseStatus(value: unknown): IntegrationStatus {
  const data = value as IntegrationStatus | null;
  if (!data || typeof data.ai?.configured !== 'boolean' || typeof data.ai.model !== 'string'
    || data.openBanking?.status !== 'requires_provider_approval' || data.openBanking.provider !== 'Feezback'
    || typeof data.openBanking.documentationUrl !== 'string' || typeof data.imports?.available !== 'boolean') {
    throw new Error('לא ניתן לקרוא את מצב השירותים כרגע. נסו לרענן בעוד רגע.');
  }
  return data;
}

function officialDocsUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && !url.username && !url.password
      && host === 'docs.feezback.cloud' ? url.href : null;
  } catch { return null; }
}

/** Connection metadata only. Credentials remain on the server and are never requested here. */
export const IntegrationsStatus: React.FC = () => {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const id = ++requestId.current;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
    setLoading(true);
    setError(null);
    setStatus(null);
    async function load() {
      try {
        const token = getMemToken();
        const response = await fetch(getApiUrl('/api/integrations/status'), {
          method: 'GET',
          credentials: 'include',
          redirect: 'error',
          cache: 'no-store',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          throw new Error('יש להתחבר לחשבון כדי לבדוק את מצב השירותים. במצב הדגמה שירותי השרת אינם מחוברים.');
        }
        if (!response.ok) throw new Error('לא ניתן לבדוק את מצב השירותים כרגע. בדקו שהשרת זמין ונסו שוב.');
        const result = parseStatus(await response.json());
        if (requestId.current === id && !controller.signal.aborted) setStatus(result);
      } catch (cause) {
        if (requestId.current !== id || (controller.signal.aborted && !timedOut)) return;
        // Never reflect server payloads or raw fetch errors, which may contain request details.
        const message = timedOut ? 'הבדיקה נמשכה יותר מהצפוי. אפשר לנסות לרענן שוב.'
          : cause instanceof Error && cause.message.startsWith('יש להתחבר') ? cause.message
          : 'לא ניתן לבדוק את מצב השירותים כרגע. בדקו את החיבור לשרת ונסו שוב.';
        setError(message);
      } finally {
        window.clearTimeout(timeout);
        if (requestId.current === id && (!controller.signal.aborted || timedOut)) setLoading(false);
      }
    }
    void load();
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [refresh]);

  const docs = status ? officialDocsUrl(status.openBanking.documentationUrl) : null;
  return <Card className="!border-[#dfe7d7] !rounded-2xl !p-5 text-right" >
    <div className="flex items-start justify-between gap-3">
      <div><h3 className="flex items-center gap-2 font-bold text-[#294f3b]"><ShieldCheck size={19} />חיבורים ושירותים</h3><p className="text-xs text-muted mt-1 leading-5">תמונה עדכנית של השירותים הזמינים באפליקציה</p></div>
      <button type="button" onClick={() => setRefresh(value => value + 1)} disabled={loading} aria-label="רענון מצב השירותים" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#e0e8d8] bg-[#f5f8f0] px-3 py-2 text-xs text-[#526e42] disabled:opacity-50 disabled:cursor-wait"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />רענון</button>
    </div>
    <div aria-live="polite" aria-busy={loading}>
      {loading && <p className="py-7 text-center text-xs text-muted">בודקים את מצב השירותים…</p>}
      {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-[#faf3e9] p-3 text-xs leading-6 text-[#876743]"><AlertCircle size={16} className="mt-1 shrink-0" /><p>{error}</p></div>}
      {status && <div className="mt-4 divide-y divide-[#edf0e8]">
        <section className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} className="text-[#7b9864]" />תובנות חכמות</h4><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.ai.configured ? 'bg-[#edf4e5] text-[#547444]' : 'bg-[#f7f0e4] text-[#94723e]'}`}>{status.ai.configured && <CheckCircle2 size={12} />}{status.ai.configured ? 'מוגדר בשרת' : 'נדרש חיבור שירות'}</span></div>
          <p className="mt-2 text-xs leading-6 text-muted">{status.ai.configured ? 'שירות התובנות מוגדר בשרת וזמין מתוך החשבון שלך, ללא הזנת מפתח אישי בדפדפן. המפתח נשמר בשרת.' : 'מפתח שירות התובנות עדיין לא מוגדר בשרת. מנהל האפליקציה צריך להגדיר אותו כדי להפעיל תובנות אוטומטיות.'}</p>
          <p className="mt-1 text-[11px] leading-5 text-muted">מנוע התזרים, התקציב והתחזית פועלים גם ללא שירות תובנות חיצוני.</p>
          {status.ai.configured && <p className="mt-1 text-[10px] text-muted">מצב ההגדרה אינו בדיקת זמינות חיה של ספק התובנות.</p>}
        </section>
        <section className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="flex items-center gap-2 text-sm font-semibold"><Landmark size={16} className="text-[#7b9864]" />חיבור לבנק</h4><span className="rounded-full bg-[#f1f2ee] px-2.5 py-1 text-[10px] font-semibold text-[#7f8777]">טרם הופעל</span></div>
          <p className="mt-2 text-xs leading-6 text-muted">חיבור דרך {status.openBanking.provider} דורש אישור והקמת גישה אצל הספק, ולאחר מכן הסכמה מפורשת שלך לשיתוף הנתונים בתהליך הבנק. החיבור אינו פעיל כרגע ואין סנכרון אוטומטי עם הבנק.</p>
          {docs && <a href={docs} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#617c4d] underline underline-offset-4">לתיעוד הרשמי של Feezback<ExternalLink size={12} /></a>}
        </section>
        <section className="pt-4"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="flex items-center gap-2 text-sm font-semibold"><FileSpreadsheet size={16} className="text-[#7b9864]" />ייבוא תנועות</h4><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.imports.available ? 'bg-[#edf4e5] text-[#547444]' : 'bg-[#f1f2ee] text-[#7f8777]'}`}>{status.imports.available ? 'זמין' : 'לא זמין כרגע'}</span></div><p className="mt-2 text-xs leading-6 text-muted">{status.imports.available ? 'אפשר לייבא קובץ תנועות דרך מסך התנועות, או להוסיף תנועה ידנית. אין צורך בחיבור בנק פעיל.' : 'אפשר להוסיף תנועות ידנית. ייבוא קבצים אינו זמין כרגע.'}</p></section>
      </div>}
    </div>
  </Card>;
};
