import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Send, ShieldCheck, KeyRound, ImagePlus, Sparkles, Trash2, MessageCircle } from 'lucide-react';
import { InvestmentState, StockHolding, Transaction, UserProfile } from '../types';
import { chatWithGemini } from '../utils/geminiStatementImport';
import { categorize, CATEGORIES, CategoryKey } from '../utils/categories';
import { Button, Card, Spinner } from './ui';
import '../ai-assistant.css';

type Proposal = { type: 'add_transaction' | 'update_variable_budget' | 'update_keren' | 'update_pension' | 'update_stocks'; description?: string; amount: number; date?: string; cat?: string; ytd?: number; cash?: number; holdings?: Array<Partial<StockHolding>> };
type Message = { role: 'user' | 'model'; text: string };
interface Props { profile: UserProfile; transactions: Transaction[]; investments: InvestmentState; memoryKey: string; onNavigateToTab: (tab: string) => void; onAddTransaction: (transaction: Transaction) => void; onUpdateProfile: (profile: UserProfile) => void; onUpdateInvestment: (investment: Partial<InvestmentState>) => void; }
const quickQuestions = ['על מה הוצאתי הכי הרבה החודש?', 'איך אפשר לחסוך השבוע?', 'מה צפוי עד סוף החודש?'];

const today = () => { const date = new Date(); return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); };
const readReply = (text: string): { answer: string; proposal?: Proposal } => {
  try {
    const fence = String.fromCharCode(96).repeat(3);
    const cleaned = text.trim().replace(fence + 'json', '').replace(fence, '').trim();
    const parsed = JSON.parse(cleaned);
    const action = parsed?.proposal;
    const valid = action && ['add_transaction', 'update_variable_budget', 'update_keren', 'update_pension', 'update_stocks'].includes(action.type) && Number.isFinite(Number(action.amount)) && Number(action.amount) > 0;
    return { answer: typeof parsed?.answer === 'string' ? parsed.answer : text, proposal: valid ? { ...action, amount: Number(action.amount) } : undefined };
  } catch { return { answer: text }; }
};
const numberFromText = (text: string) => Number((text.match(/(?:₪|שח|שקל(?:ים)?)?\s*(\d[\d,]*(?:\.\d+)?)/)?.[1] || '').replace(/,/g, ''));
const requestedAction = (text: string) => /(הוסף|תוסיף|הכנס|הכניס|עדכן|תעדכן|שנה|תקציב)/.test(text);
const localProposal = (text: string): Proposal | undefined => {
  const amount = numberFromText(text);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  if (/תקציב/.test(text) && /(עדכן|תעדכן|שנה|קבע)/.test(text)) return { type: 'update_variable_budget', amount };
  const income = /הכנסה|משכורת|שכר/.test(text);
  const expense = /הוצאה|קנייה|קניה|שלמתי|שילמתי/.test(text);
  if (!income && !expense) return undefined;
  const description = text.replace(/(?:תוסיף|הוסף|הכנס|הכניס|לי|הוצאה|הכנסה|של|בסך|₪|שח|שקל(?:ים)?|\d[\d,]*(?:\.\d+)?|היום)/g, ' ').replace(/\s+/g, ' ').trim();
  return { type: 'add_transaction', amount, description: description || (income ? 'הכנסה חדשה' : 'הוצאה חדשה'), cat: income ? 'הכנסה' : categorize(description).cat };
};
export const FinancialAssistantTab: React.FC<Props> = ({ profile, transactions, investments, memoryKey, onNavigateToTab, onAddTransaction, onUpdateProfile, onUpdateInvestment }) => {
  const storageKey = 'aifina_ai_conversation_' + memoryKey;
  const [messages, setMessages] = useState<Message[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); return Array.isArray(saved) ? saved.filter(item => item && (item.role === 'user' || item.role === 'model') && typeof item.text === 'string').slice(-40) : []; } catch { return []; }
  });
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageMode, setImageMode] = useState<'auto' | 'stocks' | 'keren' | 'pension'>('auto');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const hasKey = Boolean(localStorage.getItem('fil_gemini_api_key'));
  const context = useMemo(() => JSON.stringify({ profile: { netSalary: profile.netSalary, bankBalance: profile.bankBalance, creditDebt: profile.creditDebt, safetyBuffer: profile.safetyBuffer, creditDay: profile.creditDay, creditCycleDay: profile.creditCycleDay }, transactions: transactions.slice(0, 120).map(({ date, description, amount, cat, status, paymentMethod, cashflowDate }) => ({ date, description, amount, cat, status, paymentMethod, cashflowDate })) }), [profile, transactions]);
  const systemPrompt = 'אתה העוזר הפיננסי של AIfina. ענה בעברית, בקצרה ובבהירות. הנתונים פרטיים ונשלחו רק כדי לענות לשאלה. אל תמציא נתונים, אל תיתן ייעוץ השקעות או משפטי. למשתמש יש הרשאה קבועה לפעולות מוגבלות: הוספת הכנסה או הוצאה מפורשת, עדכון תקציב הוצאות משתנות, ועדכון תיק מניות, קרן השתלמות או פנסיה אך ורק כאשר הנתונים חולצו מתמונה שהמשתמש העלה. הפעולות המורשות מבוצעות אוטומטית — אל תגיד שאין לך הרשאה לעדכן אותן. חשוב: לעולם אל תכתוב שהפעולה בוצעה, נשמרה או עודכנה בתוך answer. רק האפליקציה מדווחת על ביצוע לאחר ששמרה אותו. החזר אך ורק JSON תקין, ללא markdown וללא גדרות קוד, במבנה {"answer":"תשובה למשתמש","proposal":null}. אם המשתמש מבקש להוסיף הכנסה או הוצאה מפורשת, proposal יהיה {"type":"add_transaction","description":"...","amount":מספר חיובי,"date":"YYYY-MM-DD","cat":"אחת מהקטגוריות: הכנסה, מזון ושוק, דיור, תחבורה, חשבונות, בריאות, בידור, קניות, חיסכון, שונות"}. עבור הכנסה הקטגוריה היא הכנסה; עבור הוצאה אל תכלול מינוס. אם המשתמש מבקש לקבוע תקציב הוצאות משתנות, proposal יהיה {"type":"update_variable_budget","amount":מספר חיובי}. בכל מקרה אחר proposal הוא null. נתוני המשתמש: ' + context;
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40))); }, [messages, storageKey]);
  const ask = async (rawQuestion?: string) => {
    const text = (rawQuestion || question).trim();
    if (!text || loading) return;
    if (!hasKey) { onNavigateToTab('settings'); return; }
    const next = [...messages, { role: 'user' as const, text }];
    setMessages(next); setQuestion(''); setLoading(true);
    try {
      const contents = [{ role: 'user', parts: [{ text: systemPrompt }] }, ...next.map(message => ({ role: message.role, parts: [{ text: message.text }] }))];
      const reply = readReply(await chatWithGemini(localStorage.getItem('fil_gemini_api_key') || '', contents));
      const proposal = reply.proposal || localProposal(text);
      const result = proposal ? applyProposal(proposal) : requestedAction(text) ? '\n\n⚠ לא בוצע שינוי: חסרים פרטים כמו סכום או סוג פעולה.' : '';
      setMessages(current => [...current, { role: 'model', text: reply.answer + result }]);
    } catch (error: any) { setMessages(current => [...current, { role: 'model', text: error?.message || 'לא הצלחתי לקבל תשובה כרגע. נסה שוב.' }]); }
    finally { setLoading(false); }
  };
  const analyzeImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || loading) return;
    event.target.value = '';
    if (!hasKey) { onNavigateToTab('settings'); return; }
    setMessages(current => [...current, { role: 'user', text: 'ניתוח תמונה: ' + file.name }]);
    setLoading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => reject(new Error('לא ניתן לקרוא את התמונה.')); reader.readAsDataURL(file); });
      const data = dataUrl.split(',')[1];
      if (!data) throw new Error('התמונה לא נקראה בצורה תקינה.');
      const imagePrompt = systemPrompt + ' סוג המסמך שנבחר על ידי המשתמש: ' + imageMode + '. התמונה המצורפת יכולה להיות קבלה, פירוט עסקה, דף חשבון, צילום תיק מניות, קרן השתלמות או פנסיה. אם נבחר stocks, התייחס לתמונה כתיק השקעות גם אם הכותרת לא ברורה. חלץ רק פרטים שרואים בתמונה, אך אל תענה שאינך יכול לצפות בתמונה. בקבלה או תנועה מזוהה, הצע add_transaction מתאים. בקרן השתלמות הצע {"type":"update_keren","amount":שווי חיובי,"ytd":תשואה באחוזים אם נראית}; בפנסיה הצע {"type":"update_pension","amount":שווי חיובי,"ytd":תשואה באחוזים אם נראית}. בתיק מניות חובה להחזיר update_stocks אם זוהתה לפחות מניה אחת או יתרת מזומן: {"type":"update_stocks","amount":מספר המניות שזוהו או 1 אם זוהה רק מזומן,"cash":יתרת המזומן בתיק כמספר, 0 אם לא מופיעה, "holdings":[{"symbol":"...","name":"...","shares":מספר יחידות,"avgCost":מחיר קנייה ממוצע אם מופיע,"currentPrice":מחיר נוכחי אם מופיע}]}. חפש במיוחד את התוויות: מזומן, יתרת מזומן, Cash, Cash balance, Available cash. מזומן אינו מניה: אל תכניס אותו ל-holdings, שמור אותו רק ב-cash. אם לא ניתן לקרוא בוודאות, proposal נשאר null.';
      const reply = readReply(await chatWithGemini(localStorage.getItem('fil_gemini_api_key') || '', [{ role: 'user', parts: [{ text: imagePrompt }, { inlineData: { data, mimeType: file.type || 'image/jpeg' } }] }]));
      const result = reply.proposal ? applyProposal(reply.proposal) : '\n\nℹ️ התמונה נותחה, אך לא נשמר שינוי כי לא זוהו נתונים מספיקים בוודאות.';
      setMessages(current => [...current, { role: 'model', text: reply.answer + result }]);
    } catch (error: any) { setMessages(current => [...current, { role: 'model', text: error?.message || 'לא הצלחתי לנתח את התמונה.' }]); }
    finally { setLoading(false); }
  };
  const applyProposal = (proposal: Proposal) => {
    if (proposal.type === 'update_keren') {
      onUpdateInvestment({ kerenValue: proposal.amount, kerenYTD: Number.isFinite(Number(proposal.ytd)) ? Number(proposal.ytd) : investments.kerenYTD });
      return '\n\n✓ שווי קרן ההשתלמות עודכן.';
    }
    if (proposal.type === 'update_pension') {
      onUpdateInvestment({ pensionValue: proposal.amount, pensionYTD: Number.isFinite(Number(proposal.ytd)) ? Number(proposal.ytd) : investments.pensionYTD });
      return '\n\n✓ שווי הפנסיה עודכן.';
    }
    if (proposal.type === 'update_stocks') {
      const holdings = (proposal.holdings || []).filter(item => item.symbol && Number(item.shares) > 0).map((item, index) => ({ id: 'assistant-stock-' + Date.now() + '-' + index, symbol: String(item.symbol).toUpperCase(), name: item.name || item.symbol || 'מניה שזוהתה', shares: Number(item.shares), avgCost: Number(item.avgCost) || Number(item.currentPrice) || 0, currentPrice: Number(item.currentPrice) || undefined, color: '#6366F1' }));
      const cash = Number(proposal.cash);
      const hasCash = Number.isFinite(cash) && cash >= 0;
      if (!holdings.length && !hasCash) return '\n\nלא נשמרו מניות כי לא זוהו מספיק פרטים בתמונה.';
      onUpdateInvestment({ ...(holdings.length ? { portfolioHoldings: holdings } : {}), ...(hasCash ? { portfolioCash: cash } : {}) });
      return '\n\n✓ תיק המניות עודכן' + (holdings.length ? ' ב־' + holdings.length + ' נכסים' : '') + (hasCash ? (holdings.length ? ' · ' : ' · ') + 'מזומן נפרד: ' + cash.toLocaleString('he-IL') + ' ₪' : '') + '.';
    }
    if (proposal.type === 'update_variable_budget') {
      onUpdateProfile({ ...profile, monthlyVariableBudget: proposal.amount });
      return '\n\n✓ התקציב החודשי להוצאות משתנות עודכן ל־' + proposal.amount.toLocaleString('he-IL') + ' ₪.';
    }
    const category = CATEGORIES[proposal.cat as CategoryKey] || CATEGORIES['שונות'];
    const income = proposal.cat === 'הכנסה';
    onAddTransaction({ id: 'assistant-' + Date.now(), description: proposal.description || (income ? 'הכנסה חדשה' : 'הוצאה חדשה'), amount: income ? proposal.amount : -proposal.amount, date: proposal.date || today(), cat: income ? 'הכנסה' : (proposal.cat || 'שונות'), color: category.color, emoji: category.emoji, account: 'נוסף דרך עוזר AI', status: 'posted', kind: income ? 'income' : 'expense', expenseType: income ? undefined : 'variable', paymentMethod: 'bank', balanceIncluded: false });
    return '\n\n✓ הפעולה בוצעה ונשמרה בתנועות.';
  };
  return <main dir="rtl" className="ai-page mx-auto space-y-5 px-4 py-7 md:px-8">
    <header className="ai-hero"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[#d7f281]"><Sparkles size={18} /><span className="text-sm font-bold">AIfina AI</span></div><h1 className="mt-2 text-3xl font-extrabold">העוזר הפיננסי שלך</h1><p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/80">שואל, מסכם ופועל לפי מה שסיכמתם — על בסיס הנתונים האישיים שלך.</p></div><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#d7f281] text-[#285545]"><Bot size={25} /></div></div></header>
    {!hasKey && <Card className="border-amber-200 bg-amber-50"><div className="flex gap-3"><KeyRound className="shrink-0 text-amber-700" /><div><strong className="text-ink">צריך לחבר את Gemini פעם אחת</strong><p className="mt-1 text-sm text-muted">המפתח נשמר רק במכשיר שלך. בלי מפתח העוזר לא שולח נתונים לשום מקום.</p><Button className="mt-3" onClick={() => onNavigateToTab('settings')}>להגדרת Gemini</Button></div></div></Card>}
    <div className="ai-shell">
    <Card className="ai-chat">
      <div className="ai-chat-head"><div className="flex items-center gap-2 text-sm font-bold text-ink"><span className="ai-info-icon"><MessageCircle size={17} /></span>השיחה שלך</div>{messages.length > 0 && <button type="button" onClick={() => setMessages([])} className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-expense"><Trash2 size={14} />נקה שיחה</button>}</div>
      <div className="ai-thread">{messages.length === 0 && <div className="ai-empty"><strong className="text-ink">במה נעשה סדר היום?</strong><p className="mt-1 text-sm text-muted">אפשר לשאול, לבקש פעולה או להעלות צילום.</p><div className="ai-chips">{quickQuestions.map(item => <button key={item} onClick={() => ask(item)} className="ai-chip">{item}</button>)}</div></div>}
      {messages.map((message, index) => <div key={index} className={'ai-message ' + (message.role === 'user' ? 'user' : 'bot')}><strong className="mb-1 block text-xs opacity-60">{message.role === 'user' ? 'אתה' : 'AIfina AI'}</strong>{message.text}</div>)}
      {loading && <div className="flex items-center gap-2 text-sm text-muted"><Spinner size="sm" />חושב על הנתונים שלך…</div>}</div>
      <div className="flex flex-wrap gap-2 px-4 pb-1 text-xs"><span className="self-center text-muted">העלאת תמונה:</span>{([['auto', 'זיהוי אוטומטי'], ['stocks', 'תיק מניות'], ['keren', 'קרן השתלמות'], ['pension', 'פנסיה']] as const).map(([mode, label]) => <button type="button" key={mode} onClick={() => setImageMode(mode)} className={'rounded-full px-3 py-1.5 font-semibold ' + (imageMode === mode ? 'bg-primary text-white' : 'bg-surface text-muted')}>{label}</button>)}</div>
      <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={analyzeImage} className="hidden" />
      <form className="ai-composer" onSubmit={event => { event.preventDefault(); ask(); }}><button type="button" onClick={() => imageInputRef.current?.click()} disabled={loading} aria-label="העלאת תמונה לניתוח" className="ai-upload"><ImagePlus size={20} /></button><input value={question} onChange={event => setQuestion(event.target.value)} placeholder="למשל: כמה נשאר לי להוצאות עד סוף החודש?" className="min-w-0 flex-1 rounded-xl border border-line bg-card px-4 text-sm text-ink outline-none focus:border-primary" /><Button type="submit" className="ai-send" disabled={!question.trim() || loading}><Send size={17} />שלח</Button></form>
    </Card>
    <aside className="ai-aside"><Card><div className="flex gap-3"><span className="ai-info-icon"><ShieldCheck size={18} /></span><p className="text-sm leading-6 text-muted"><strong className="text-ink">הרשאה קבועה פעילה</strong><br />בקשה מפורשת להוסיף הכנסה/הוצאה או לעדכן תקציב משתנה נשמרת מיד.</p></div></Card><Card><div className="flex gap-3"><span className="ai-info-icon"><MessageCircle size={18} /></span><p className="text-sm leading-6 text-muted"><strong className="text-ink">העוזר זוכר</strong><br />השיחה נשמרת במכשיר הזה כדי שתוכל להמשיך מאיפה שעצרת.</p></div></Card><Card><div className="flex gap-3"><span className="ai-info-icon"><ImagePlus size={18} /></span><p className="text-sm leading-6 text-muted"><strong className="text-ink">אפשר גם תמונה</strong><br />קבלה, תיק מניות, קרן השתלמות או פנסיה — לחץ על סמל התמונה בצ׳אט.</p></div></Card></aside>
    </div>
  </main>;
};
