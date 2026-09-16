import React, { useMemo, useRef, useState } from 'react';
import { Bot, Send, ShieldCheck, Wrench, KeyRound, ImagePlus } from 'lucide-react';
import { InvestmentState, StockHolding, Transaction, UserProfile } from '../types';
import { chatWithGemini } from '../utils/geminiStatementImport';
import { CATEGORIES, CategoryKey } from '../utils/categories';
import { Button, Card, Spinner } from './ui';

type Proposal = { type: 'add_transaction' | 'update_variable_budget' | 'update_keren' | 'update_pension' | 'update_stocks'; description?: string; amount: number; date?: string; cat?: string; ytd?: number; holdings?: Array<Partial<StockHolding>> };
type Message = { role: 'user' | 'model'; text: string };
interface Props { profile: UserProfile; transactions: Transaction[]; investments: InvestmentState; onNavigateToTab: (tab: string) => void; onAddTransaction: (transaction: Transaction) => void; onUpdateProfile: (profile: UserProfile) => void; onUpdateInvestment: (investment: Partial<InvestmentState>) => void; }
const quickQuestions = ['על מה הוצאתי הכי הרבה החודש?', 'איך אפשר לחסוך השבוע?', 'מה צפוי עד סוף החודש?'];

const today = () => { const date = new Date(); return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); };
const readReply = (text: string): { answer: string; proposal?: Proposal } => {
  try {
    const parsed = JSON.parse(text.trim());
    const action = parsed?.proposal;
    const valid = action && ['add_transaction', 'update_variable_budget', 'update_keren', 'update_pension', 'update_stocks'].includes(action.type) && Number.isFinite(Number(action.amount)) && Number(action.amount) > 0;
    return { answer: typeof parsed?.answer === 'string' ? parsed.answer : text, proposal: valid ? { ...action, amount: Number(action.amount) } : undefined };
  } catch { return { answer: text }; }
};
export const FinancialAssistantTab: React.FC<Props> = ({ profile, transactions, investments, onNavigateToTab, onAddTransaction, onUpdateProfile, onUpdateInvestment }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const hasKey = Boolean(localStorage.getItem('fil_gemini_api_key'));
  const context = useMemo(() => JSON.stringify({ profile: { netSalary: profile.netSalary, bankBalance: profile.bankBalance, creditDebt: profile.creditDebt, safetyBuffer: profile.safetyBuffer, creditDay: profile.creditDay, creditCycleDay: profile.creditCycleDay }, transactions: transactions.slice(0, 120).map(({ date, description, amount, cat, status, paymentMethod, cashflowDate }) => ({ date, description, amount, cat, status, paymentMethod, cashflowDate })) }), [profile, transactions]);
  const systemPrompt = 'אתה העוזר הפיננסי של AIfina. ענה בעברית, בקצרה ובבהירות. הנתונים פרטיים ונשלחו רק כדי לענות לשאלה. אל תמציא נתונים, אל תיתן ייעוץ השקעות או משפטי. למשתמש יש הרשאה קבועה לפעולות מוגבלות: הוספת הכנסה או הוצאה מפורשת, ועדכון תקציב הוצאות משתנות. כשהוא מבקש פעולה כזאת במפורש, היא תבוצע אוטומטית. החזר אך ורק JSON תקין במבנה {"answer":"תשובה למשתמש","proposal":null}. אם המשתמש מבקש להוסיף הכנסה או הוצאה מפורשת, proposal יהיה {"type":"add_transaction","description":"...","amount":מספר חיובי,"date":"YYYY-MM-DD","cat":"אחת מהקטגוריות: הכנסה, מזון ושוק, דיור, תחבורה, חשבונות, בריאות, בידור, קניות, חיסכון, שונות"}. עבור הכנסה הקטגוריה היא הכנסה; עבור הוצאה אל תכלול מינוס. אם המשתמש מבקש לקבוע תקציב הוצאות משתנות, proposal יהיה {"type":"update_variable_budget","amount":מספר חיובי}. בכל מקרה אחר proposal הוא null. נתוני המשתמש: ' + context;
  const ask = async (rawQuestion?: string) => {
    const text = (rawQuestion || question).trim();
    if (!text || loading) return;
    if (!hasKey) { onNavigateToTab('settings'); return; }
    const next = [...messages, { role: 'user' as const, text }];
    setMessages(next); setQuestion(''); setLoading(true);
    try {
      const contents = [{ role: 'user', parts: [{ text: systemPrompt }] }, ...next.map(message => ({ role: message.role, parts: [{ text: message.text }] }))];
      const reply = readReply(await chatWithGemini(localStorage.getItem('fil_gemini_api_key') || '', contents));
      const result = reply.proposal ? applyProposal(reply.proposal) : '';
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
      const imagePrompt = systemPrompt + ' התמונה המצורפת יכולה להיות קבלה, פירוט עסקה, דף חשבון, צילום תיק מניות, קרן השתלמות או פנסיה. סווג אותה במפורש כאחד: הוצאה, הכנסה/זיכוי, מניות, קרן השתלמות, פנסיה, או לא ניתן לזהות. חלץ רק פרטים שרואים בתמונה. בקבלה או תנועה מזוהה, הצע add_transaction מתאים. בקרן השתלמות הצע {"type":"update_keren","amount":שווי חיובי,"ytd":תשואה באחוזים אם נראית}; בפנסיה הצע {"type":"update_pension","amount":שווי חיובי,"ytd":תשואה באחוזים אם נראית}; בתיק מניות הצע {"type":"update_stocks","amount":מספר המניות שזוהו,"holdings":[{"symbol":"...","name":"...","shares":מספר,"avgCost":מספר,"currentPrice":מספר}]}. אם לא ניתן לקרוא בוודאות, proposal נשאר null.';
      const reply = readReply(await chatWithGemini(localStorage.getItem('fil_gemini_api_key') || '', [{ role: 'user', parts: [{ text: imagePrompt }, { inlineData: { data, mimeType: file.type || 'image/jpeg' } }] }]));
      const result = reply.proposal ? applyProposal(reply.proposal) : '';
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
      if (!holdings.length) return '\n\nלא נשמרו מניות כי לא זוהו מספיק פרטים בתמונה.';
      onUpdateInvestment({ portfolioHoldings: holdings });
      return '\n\n✓ תיק המניות עודכן ב־' + holdings.length + ' נכסים שזוהו.';
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
  return <main dir="rtl" className="mx-auto max-w-4xl space-y-5 px-4 py-7 md:px-8">
    <header><div className="flex items-center gap-2 text-primary"><Bot size={22} /><span className="text-sm font-bold">AIfina AI</span></div><h1 className="mt-2 text-3xl font-extrabold text-ink">העוזר הפיננסי שלך</h1><p className="mt-2 text-sm text-muted">שאל על הוצאות, תזרים, תקציב והרגלים. הוא עונה רק על בסיס הנתונים שלך.</p></header>
    {!hasKey && <Card className="border-amber-200 bg-amber-50"><div className="flex gap-3"><KeyRound className="shrink-0 text-amber-700" /><div><strong className="text-ink">צריך לחבר את Gemini פעם אחת</strong><p className="mt-1 text-sm text-muted">המפתח נשמר רק במכשיר שלך. בלי מפתח העוזר לא שולח נתונים לשום מקום.</p><Button className="mt-3" onClick={() => onNavigateToTab('settings')}>להגדרת Gemini</Button></div></div></Card>}
    <Card className="space-y-4">
      {messages.length === 0 && <div className="rounded-xl bg-surface p-4"><strong className="text-ink">אפשר להתחיל כאן</strong><div className="mt-3 flex flex-wrap gap-2">{quickQuestions.map(item => <button key={item} onClick={() => ask(item)} className="rounded-full border border-line bg-card px-3 py-2 text-sm text-ink hover:border-primary">{item}</button>)}</div></div>}
      {messages.map((message, index) => <div key={index} className={'max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap ' + (message.role === 'user' ? 'mr-auto bg-primary text-white' : 'bg-surface text-ink')}><strong className="mb-1 block text-xs opacity-70">{message.role === 'user' ? 'אתה' : 'AIfina AI'}</strong>{message.text}</div>)}
      {loading && <div className="flex items-center gap-2 text-sm text-muted"><Spinner size="sm" />חושב על הנתונים שלך…</div>}
      <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={analyzeImage} className="hidden" />
      <form className="flex gap-2 border-t border-line pt-4" onSubmit={event => { event.preventDefault(); ask(); }}><button type="button" onClick={() => imageInputRef.current?.click()} disabled={loading} aria-label="העלאת תמונה לניתוח" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-line text-muted hover:border-primary hover:text-primary disabled:opacity-50"><ImagePlus size={20} /></button><input value={question} onChange={event => setQuestion(event.target.value)} placeholder="למשל: כמה נשאר לי להוצאות עד סוף החודש?" className="min-w-0 flex-1 rounded-xl border border-line bg-card px-4 text-sm text-ink outline-none focus:border-primary" /><Button type="submit" disabled={!question.trim() || loading}><Send size={17} />שלח</Button></form>
    </Card>
    <Card className="border-primary/15 bg-primary/5"><div className="flex gap-3"><ShieldCheck className="shrink-0 text-primary" /><p className="text-sm leading-6 text-muted"><strong className="text-ink">הרשאה קבועה פעילה:</strong> בקשה מפורשת להוסיף הכנסה/הוצאה או לעדכן תקציב משתנה תתבצע מיד ותישמר בתנועות.</p></div></Card>
    <Card><div className="flex gap-3"><Wrench className="shrink-0 text-muted" /><div><strong className="text-ink">סוכן פיתוח</strong><p className="mt-1 text-sm leading-6 text-muted">לשינוי קוד אמיתי הוא ייצור Pull Request לבדיקה, לאחר חיבור מאובטח לחשבון GitHub.</p></div></div></Card>
  </main>;
};
