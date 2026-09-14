import React, { useMemo, useState } from 'react';
import { Bot, Send, ShieldCheck, Wrench, KeyRound } from 'lucide-react';
import { Transaction, UserProfile } from '../types';
import { chatWithGemini } from '../utils/geminiStatementImport';
import { Button, Card, Spinner } from './ui';

type Message = { role: 'user' | 'model'; text: string };
interface Props { profile: UserProfile; transactions: Transaction[]; onNavigateToTab: (tab: string) => void; }
const quickQuestions = ['על מה הוצאתי הכי הרבה החודש?', 'איך אפשר לחסוך השבוע?', 'מה צפוי עד סוף החודש?'];

export const FinancialAssistantTab: React.FC<Props> = ({ profile, transactions, onNavigateToTab }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const hasKey = Boolean(localStorage.getItem('fil_gemini_api_key'));
  const context = useMemo(() => JSON.stringify({ profile: { netSalary: profile.netSalary, bankBalance: profile.bankBalance, creditDebt: profile.creditDebt, safetyBuffer: profile.safetyBuffer, creditDay: profile.creditDay, creditCycleDay: profile.creditCycleDay }, transactions: transactions.slice(0, 120).map(({ date, description, amount, cat, status, paymentMethod, cashflowDate }) => ({ date, description, amount, cat, status, paymentMethod, cashflowDate })) }), [profile, transactions]);
  const ask = async (rawQuestion?: string) => {
    const text = (rawQuestion || question).trim();
    if (!text || loading) return;
    if (!hasKey) { onNavigateToTab('settings'); return; }
    const next = [...messages, { role: 'user' as const, text }];
    setMessages(next); setQuestion(''); setLoading(true);
    try {
      const system = 'אתה העוזר הפיננסי של AIfina. ענה בעברית, בקצרה ובבהירות. הנתונים פרטיים ונשלחו רק כדי לענות לשאלה. אל תמציא נתונים, אל תיתן ייעוץ השקעות או משפטי, ואל תבצע שינוי ללא אישור מפורש. כשיש חוסר ודאות ציין אותו. נתוני המשתמש: ' + context;
      const contents = [{ role: 'user', parts: [{ text: system }] }, ...next.map(message => ({ role: message.role, parts: [{ text: message.text }] }))];
      const answer = await chatWithGemini(localStorage.getItem('fil_gemini_api_key') || '', contents);
      setMessages(current => [...current, { role: 'model', text: answer }]);
    } catch (error: any) { setMessages(current => [...current, { role: 'model', text: error?.message || 'לא הצלחתי לקבל תשובה כרגע. נסה שוב.' }]); }
    finally { setLoading(false); }
  };
  return <main dir="rtl" className="mx-auto max-w-4xl space-y-5 px-4 py-7 md:px-8">
    <header><div className="flex items-center gap-2 text-primary"><Bot size={22} /><span className="text-sm font-bold">AIfina AI</span></div><h1 className="mt-2 text-3xl font-extrabold text-ink">העוזר הפיננסי שלך</h1><p className="mt-2 text-sm text-muted">שאל על הוצאות, תזרים, תקציב והרגלים. הוא עונה רק על בסיס הנתונים שלך.</p></header>
    {!hasKey && <Card className="border-amber-200 bg-amber-50"><div className="flex gap-3"><KeyRound className="shrink-0 text-amber-700" /><div><strong className="text-ink">צריך לחבר את Gemini פעם אחת</strong><p className="mt-1 text-sm text-muted">המפתח נשמר רק במכשיר שלך. בלי מפתח העוזר לא שולח נתונים לשום מקום.</p><Button className="mt-3" onClick={() => onNavigateToTab('settings')}>להגדרת Gemini</Button></div></div></Card>}
    <Card className="space-y-4">
      {messages.length === 0 && <div className="rounded-xl bg-surface p-4"><strong className="text-ink">אפשר להתחיל כאן</strong><div className="mt-3 flex flex-wrap gap-2">{quickQuestions.map(item => <button key={item} onClick={() => ask(item)} className="rounded-full border border-line bg-card px-3 py-2 text-sm text-ink hover:border-primary">{item}</button>)}</div></div>}
      {messages.map((message, index) => <div key={index} className={'max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap ' + (message.role === 'user' ? 'mr-auto bg-primary text-white' : 'bg-surface text-ink')}><strong className="mb-1 block text-xs opacity-70">{message.role === 'user' ? 'אתה' : 'AIfina AI'}</strong>{message.text}</div>)}
      {loading && <div className="flex items-center gap-2 text-sm text-muted"><Spinner size="sm" />חושב על הנתונים שלך…</div>}
      <form className="flex gap-2 border-t border-line pt-4" onSubmit={event => { event.preventDefault(); ask(); }}><input value={question} onChange={event => setQuestion(event.target.value)} placeholder="למשל: כמה נשאר לי להוצאות עד סוף החודש?" className="min-w-0 flex-1 rounded-xl border border-line bg-card px-4 text-sm text-ink outline-none focus:border-primary" /><Button type="submit" disabled={!question.trim() || loading}><Send size={17} />שלח</Button></form>
    </Card>
    <Card className="border-primary/15 bg-primary/5"><div className="flex gap-3"><ShieldCheck className="shrink-0 text-primary" /><p className="text-sm leading-6 text-muted"><strong className="text-ink">שליטה אצלך:</strong> העוזר מסביר ומציע. הוא לא משנה עסקאות, תקציב או הגדרות בלי אישור מפורש.</p></div></Card>
    <Card><div className="flex gap-3"><Wrench className="shrink-0 text-muted" /><div><strong className="text-ink">סוכן פיתוח</strong><p className="mt-1 text-sm leading-6 text-muted">לשינוי קוד אמיתי הוא ייצור Pull Request לבדיקה, לאחר חיבור מאובטח לחשבון GitHub.</p></div></div></Card>
  </main>;
};
