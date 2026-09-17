import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Send, ShieldCheck, KeyRound, ImagePlus, Sparkles, Trash2, MessageCircle } from 'lucide-react';
import { InvestmentState, StandingOrder, StockHolding, Transaction, UserProfile } from '../types';
import { chatWithGemini } from '../utils/geminiStatementImport';
import { categorize, CATEGORIES, CategoryKey } from '../utils/categories';
import { moneyNumber, normalizePortfolioProposal, portfolioNumber } from '../utils/portfolioProposal';
import { buyPortfolioHolding, depositPortfolioCash, PortfolioCurrency } from '../utils/portfolioActions';
import { Button, Card, Spinner } from './ui';
import '../ai-assistant.css';

type Proposal = { type: 'add_transaction' | 'update_variable_budget' | 'update_keren' | 'update_pension' | 'update_stocks' | 'portfolio_deposit' | 'portfolio_buy'; description?: string; amount: number; date?: string; cat?: string; ytd?: number; cash?: number; cashCurrency?: 'ILS' | 'USD'; currency?: PortfolioCurrency; symbol?: string; name?: string; shares?: number; price?: number; holdings?: Array<Partial<StockHolding> & { totalValue?: number; value?: number }> };
type Message = { role: 'user' | 'model'; text: string };
interface Props { profile: UserProfile; transactions: Transaction[]; investments: InvestmentState; standingOrders: StandingOrder[]; memoryKey: string; onNavigateToTab: (tab: string) => void; onAddTransaction: (transaction: Transaction) => void; onUpdateProfile: (profile: UserProfile) => void; onUpdateInvestment: (investment: Partial<InvestmentState>) => void; }
const quickQuestions = ['על מה הוצאתי הכי הרבה החודש?', 'איך אפשר לחסוך השבוע?', 'מה צפוי עד סוף החודש?'];

const today = () => { const date = new Date(); return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); };
const readReply = (text: string): { answer: string; proposal?: Proposal } => {
  try {
    const fence = String.fromCharCode(96).repeat(3);
    const cleaned = text.trim().replace(fence + 'json', '').replace(fence, '').trim();
    const parsed = JSON.parse(cleaned);
    const action = parsed?.proposal;
    const stockUpdate = action?.type === 'update_stocks' && (Array.isArray(action.holdings) || Number.isFinite(Number(action.cash)));
    const buy = action?.type === 'portfolio_buy' && Boolean(action.symbol) && Number(action.shares) > 0 && Number(action.price) > 0;
    const valid = action && ['add_transaction', 'update_variable_budget', 'update_keren', 'update_pension', 'update_stocks', 'portfolio_deposit', 'portfolio_buy'].includes(action.type) && (stockUpdate || buy || (Number.isFinite(Number(action.amount)) && Number(action.amount) > 0));
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
export const FinancialAssistantTab: React.FC<Props> = ({ profile, transactions, investments, standingOrders, memoryKey, onNavigateToTab, onAddTransaction, onUpdateProfile, onUpdateInvestment }) => {
  const storageKey = 'aifina_ai_conversation_' + memoryKey;
  const [messages, setMessages] = useState<Message[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); return Array.isArray(saved) ? saved.filter(item => item && (item.role === 'user' || item.role === 'model') && typeof item.text === 'string').slice(-40) : []; } catch { return []; }
  });
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageMode, setImageMode] = useState<'auto' | 'stocks' | 'keren' | 'pension'>('auto');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const hasKey = Boolean(localStorage.getItem('fil_gemini_api_key'));
  const context = useMemo(() => JSON.stringify({ profile: { netSalary: profile.netSalary, bankBalance: profile.bankBalance, balanceAsOf: profile.balanceAsOf, creditDebt: profile.creditDebt, safetyBuffer: profile.safetyBuffer, creditDay: profile.creditDay, creditCycleDay: profile.creditCycleDay }, standingOrders: standingOrders.map(({ description, amount, dayOfMonth, isActive, cat }) => ({ description, amount, dayOfMonth, isActive, cat })), transactions: transactions.slice(0, 120).map(({ date, description, amount, cat, status, paymentMethod, cashflowDate }) => ({ date, description, amount, cat, status, paymentMethod, cashflowDate })) }), [profile, standingOrders, transactions]);
  const systemPrompt = 'אתה העוזר הפיננסי של AIfina. ענה בעברית, בקצרה ובבהירות. הנתונים פרטיים ונשלחו רק כדי לענות לשאלה. אל תמציא נתונים, אל תיתן ייעוץ השקעות או משפטי. הוראות הקבע הן חלק מהתזרים שלך: כאשר תאריך הוראה פעילה הגיע, היא מופחתת בתחזית אם היתרה האחרונה שנשמרה קודמת למועד החיוב. לעולם אל תגיד שהוראות קבע אינן קשורות אליך או שאינך יכול לעזור בנושא; הסבר לפי ההוראות והיתרה שבנתונים. למשתמש יש הרשאה קבועה לפעולות מוגבלות: הוספת הכנסה או הוצאה מפורשת, עדכון תקציב הוצאות משתנות, הפקדת מזומן לתיק השקעות, קניית נייר מהמזומן הפנוי, ועדכון תיק מניות, קרן השתלמות או פנסיה מתמונה. הפעולות המורשות מבוצעות אוטומטית — אל תגיד שאין לך הרשאה לעדכן אותן. חשוב: לעולם אל תכתוב שהפעולה בוצעה, נשמרה או עודכנה בתוך answer. רק האפליקציה מדווחת על ביצוע לאחר ששמרה אותו. החזר אך ורק JSON תקין, ללא markdown וללא גדרות קוד, במבנה {"answer":"תשובה למשתמש","proposal":null}. אם המשתמש מבקש להוסיף הכנסה או הוצאה מפורשת, proposal יהיה {"type":"add_transaction","description":"...","amount":מספר חיובי,"date":"YYYY-MM-DD","cat":"אחת מהקטגוריות: הכנסה, מזון ושוק, דיור, תחבורה, חשבונות, בריאות, בידור, קניות, חיסכון, שונות"}. אם מבקש להפקיד לתיק, proposal יהיה {"type":"portfolio_deposit","amount":מספר חיובי,"currency":"ILS או USD"}. אם מבקש לקנות נייר מהמזומן, proposal יהיה {"type":"portfolio_buy","symbol":"קוד/שם נייר","name":"שם אם מופיע","shares":כמות חיובית,"price":מחיר יחידה חיובי,"currency":"ILS או USD","amount":עלות כוללת}. אל תנחש נתוני קנייה חסרים. עבור הכנסה הקטגוריה היא הכנסה; עבור הוצאה אל תכלול מינוס. אם המשתמש מבקש לקבוע תקציב הוצאות משתנות, proposal יהיה {"type":"update_variable_budget","amount":מספר חיובי}. בכל מקרה אחר proposal הוא null. נתוני המשתמש: ' + context;
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
      const imagePrompt = systemPrompt + ' סוג המסמך שנבחר על ידי המשתמש: ' + imageMode + '. התמונה המצורפת יכולה להיות קבלה, פירוט עסקה, דף חשבון, צילום תיק מניות, קרן השתלמות או פנסיה. אם נבחר stocks, התייחס לתמונה כתיק השקעות גם אם הכותרת לא ברורה. חלץ רק פרטים שרואים בתמונה, אך אל תענה שאינך יכול לצפות בתמונה. בקבלה או תנועה מזוהה, הצע add_transaction מתאים. בקרן השתלמות הצע {"type":"update_keren","amount":שווי חיובי,"ytd":תשואה באחוזים אם נראית}; בפנסיה הצע {"type":"update_pension","amount":שווי חיובי,"ytd":תשואה באחוזים אם נראית}. בתיק מניות חובה להחזיר update_stocks אם זוהתה לפחות מניה אחת או יתרת מזומן: {"type":"update_stocks","amount":מספר המניות שזוהו או 1 אם זוהה רק מזומן,"cash":יתרת המזומן בתיק כמספר רק אם היא מופיעה,"cashCurrency":"ILS או USD לפי סמל המטבע שמופיע ליד שווי המזומן","holdings":[{"symbol":"קוד נייר אם הוא מופיע, אחרת שם ייחודי","name":"...","shares":"אך ורק המספר שמופיע ליד כמות/כמות יחידות","totalValue":"אך ורק המספר שמופיע ליד שווי אחזקה/שווי נוכחי","currentPrice":"אך ורק מחיר ליחידה או שער שמופיע במפורש","avgCost":"אך ורק מחיר קנייה ממוצע שמופיע במפורש","currency":"ILS או USD לפי סמל המטבע שמופיע ליד השווי"}]}. כלל קריטי: כמות, שווי אחזקה ומחיר ליחידה הם שלושה נתונים שונים. לעולם אל תשים שווי אחזקה ב-currentPrice או ב-shares. קרא כל מספר ספרה-ספרה ושמור את כל הספרות: 50,000 הוא 50000 ולא 5000; 51,206.73 הוא 51206.73. לפני החזרת JSON בצע בדיקה עצמית נוספת של כל כמות ושווי מול השורה בתמונה. אם יש שווי וכמות ואין מחיר יחידה, החזר totalValue בלבד — האפליקציה תחשב מחיר יחידה = שווי/כמות. חשוב: קבע מטבע רק לפי סימן/עמודת מטבע מפורשים (₪ = ILS, $ = USD), ולא לפי שם הנייר. מזומן אינו מניה: אל תכניס אותו ל-holdings, שמור אותו רק ב-cash. אין מזומן בתמונה? אל תכלול את השדה cash כלל, כדי לא למחוק את יתרת המזומן הקיימת. אין לדרוס ניירות קיימים שלא מופיעים בתמונה; התמונה היא עדכון חלקי בלבד. אם לא ניתן לקרוא בוודאות, proposal נשאר null.';
      const reply = readReply(await chatWithGemini(localStorage.getItem('fil_gemini_api_key') || '', [{ role: 'user', parts: [{ text: imagePrompt }, { inlineData: { data, mimeType: file.type || 'image/jpeg' } }] }]));
      const result = reply.proposal ? applyProposal(reply.proposal) : '\n\nℹ️ התמונה נותחה, אך לא נשמר שינוי כי לא זוהו נתונים מספיקים בוודאות.';
      setMessages(current => [...current, { role: 'model', text: reply.answer + result }]);
    } catch (error: any) { setMessages(current => [...current, { role: 'model', text: error?.message || 'לא הצלחתי לנתח את התמונה.' }]); }
    finally { setLoading(false); }
  };
  const applyProposal = (proposal: Proposal) => {
    if (proposal.type === 'portfolio_deposit') {
      const currency = proposal.currency === 'ILS' ? 'ILS' : 'USD';
      onUpdateInvestment(depositPortfolioCash(investments, proposal.amount, currency));
      return '\n\n✓ הופקדו ' + proposal.amount.toLocaleString('he-IL') + ' ' + (currency === 'ILS' ? '₪' : '$') + ' למזומן הפנוי בתיק.';
    }
    if (proposal.type === 'portfolio_buy') {
      const currency = proposal.currency === 'ILS' ? 'ILS' : 'USD';
      const result = buyPortfolioHolding(investments, { symbol: proposal.symbol || '', name: proposal.name, shares: Number(proposal.shares), price: Number(proposal.price), currency });
      if (!result.update) return '\n\n⚠ הקנייה לא נוספה: ' + result.error;
      onUpdateInvestment(result.update);
      return '\n\n✓ נוספה קנייה של ' + Number(proposal.shares).toLocaleString('he-IL') + ' יח׳ ' + proposal.symbol + ' בעלות ' + (Number(proposal.shares) * Number(proposal.price)).toLocaleString('he-IL') + ' ' + (currency === 'ILS' ? '₪' : '$') + '; הסכום הופחת מהמזומן הפנוי.';
    }
    if (proposal.type === 'update_keren') {
      onUpdateInvestment({ kerenValue: proposal.amount, kerenYTD: Number.isFinite(Number(proposal.ytd)) ? Number(proposal.ytd) : investments.kerenYTD });
      return '\n\n✓ שווי קרן ההשתלמות עודכן.';
    }
    if (proposal.type === 'update_pension') {
      onUpdateInvestment({ pensionValue: proposal.amount, pensionYTD: Number.isFinite(Number(proposal.ytd)) ? Number(proposal.ytd) : investments.pensionYTD });
      return '\n\n✓ שווי הפנסיה עודכן.';
    }
    if (proposal.type === 'update_stocks') {
      const extracted = normalizePortfolioProposal(proposal);
      const importedHoldings = extracted.holdings.flatMap((item, index) => {
        const shares = portfolioNumber(item.shares);
        if (!item.symbol || !shares || shares <= 0) return [];
        const totalValue = moneyNumber(item.totalValue ?? item.value);
        const derivedPrice = totalValue !== undefined && totalValue >= 0 ? totalValue / shares : undefined;
        const currentPrice = moneyNumber(item.currentPrice) ?? derivedPrice;
        const avgCost = moneyNumber(item.avgCost) ?? currentPrice ?? 0;
        return [{ id: 'assistant-stock-' + Date.now() + '-' + index, symbol: String(item.symbol).toUpperCase(), name: item.name || item.symbol || 'מניה שזוהתה', shares, avgCost, currentPrice, currency: item.currency === 'ILS' ? 'ILS' as const : 'USD' as const, color: '#6366F1' }];
      });
      const holdings = importedHoldings.reduce<StockHolding[]>((merged, incoming) => {
        const existingIndex = merged.findIndex(item => item.symbol === incoming.symbol && (item.currency || 'USD') === incoming.currency);
        if (existingIndex < 0) return [...merged, incoming];
        const next = [...merged]; next[existingIndex] = { ...next[existingIndex], ...incoming, id: next[existingIndex].id, color: next[existingIndex].color };
        return next;
      }, investments.portfolioHoldings || []);
      const cash = extracted.cash;
      const hasCash = cash !== undefined;
      if (!holdings.length && !hasCash) return '\n\nלא נשמרו מניות כי לא זוהו מספיק פרטים בתמונה.';
      const cashCurrency = extracted.cashCurrency || 'USD';
      const nextCashBalances = hasCash ? { ...(investments.portfolioCashByCurrency || {}), [cashCurrency]: cash } : undefined;
      onUpdateInvestment({ ...(importedHoldings.length ? { portfolioHoldings: holdings } : {}), ...(nextCashBalances ? { portfolioCashByCurrency: nextCashBalances } : {}), ...(hasCash && cashCurrency === 'USD' ? { portfolioCash: cash } : {}) });
      return '\n\n✓ תיק המניות עודכן' + (importedHoldings.length ? ' ב־' + importedHoldings.length + ' נכסים חדשים או מעודכנים' : '') + (hasCash ? ' · מזומן נפרד: ' + cash.toLocaleString('he-IL') + ' ' + (cashCurrency === 'ILS' ? '₪' : '$') : '') + '.';
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
