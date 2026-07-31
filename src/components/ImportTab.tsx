import React, { useState, useRef } from 'react';
import { Transaction } from '../types';
import { readFileAsText } from '../utils/bankParsers';
import { categorize, CAT_RULES } from '../utils/categories';
import { fmtILS, fmtDate } from '../utils/formatters';
import { generateGeminiContentClient } from '../utils/apiFallback';
import {
  FileSpreadsheet,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Plus,
  Trash2,
} from 'lucide-react';

interface ImportTabProps {
  onImportTransactions: (txs: Transaction[]) => void;
  onUpdateInvestment?: (data: any) => void;
}

export const ImportTab: React.FC<ImportTabProps> = ({
  onImportTransactions,
  onUpdateInvestment,
}) => {
  const [method, setMethod] = useState<'choose' | 'excel' | 'ocr' | 'info'>('choose');
  const [fileLoading, setFileLoading] = useState(false);
  const [previewTxs, setPreviewTxs] = useState<Transaction[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // OCR state
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrDocType, setOcrDocType] = useState<'bank' | 'stocks' | 'keren' | 'pension'>('bank');
  const [ocrScanning, setOcrScanning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  // Handle Excel/CSV file upload — Gemini parses and categorizes in one call
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileLoading(true);
    setErrorMsg(null);

    try {
      const content = await readFileAsText(file);
      const customKey = localStorage.getItem('fil_gemini_api_key') || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customKey) headers['x-gemini-api-key'] = customKey;

      const res = await fetch('/api/parse-statement', {
        method: 'POST',
        headers,
        body: JSON.stringify({ content }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'שגיאה בניתוח הקובץ על ידי Gemini AI');
        return;
      }

      const txs: Transaction[] = data.transactions || [];
      if (txs.length === 0) {
        setErrorMsg('Gemini לא זיהה עסקאות בקובץ זה. ודא שמדובר בקובץ תנועות תקין.');
        return;
      }

      setPreviewTxs(txs);
    } catch (err: any) {
      setErrorMsg(err.message || 'שגיאה בחיבור לשרת. ודא שמפתח Gemini מוגדר.');
    } finally {
      setFileLoading(false);
    }
  };

  const compressImage = (base64Str: string, maxWidth = 1200, maxHeight = 1200, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Str);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  // Handle OCR receipt/bank screenshot image upload
  const handleOcrImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrScanning(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const originalBase64 = reader.result as string;
      setOcrImage(originalBase64);

      try {
        const compressedBase64 = await compressImage(originalBase64);
        const customKey = localStorage.getItem('fil_gemini_api_key') || '';
        const cleanBase64 = compressedBase64.includes(',') ? compressedBase64.split(',').pop() : compressedBase64;
        
        let localPromptText = `אתה אלגוריתם לחילוץ וסיווג עסקאות פיננסיות מתמונות.
חלץ את כל העסקאות וסווג כל אחת לאחת מהקטגוריות הבאות בלבד — אל תמציא קטגוריות חדשות.

קטגוריות מותרות בלבד:
הכנסה | מזון ושוק | דיור | תחבורה | חשבונות | בריאות | בידור | קניות | חיסכון | שונות

החזר אך ורק מערך JSON תקין ללא markdown:
[{"date":"YYYY-MM-DD","description":"שם בית העסק","amount":number,"cat":"אחת מהקטגוריות למעלה"}]

חוקים:
- סכום שלילי = הוצאה. סכום חיובי = הכנסה.
- אם לא בטוח בקטגוריה — השתמש ב"שונות".
- אם אין שנה, השתמש ב-${new Date().getFullYear()}.
- חלץ את כל השורות הגלויות בתמונה.`;

        if (ocrDocType === 'stocks') {
          localPromptText = `חלץ את כל ניירות הערך (מניות/תעודות סל) מתמונת תיק ההשקעות.
החזר אך ורק מערך JSON במבנה הבא:
[{"symbol":"TICKER","name":"שם החברה","shares":number,"avgCost":number,"currentPrice":number}]
- symbol: הסימול הבינלאומי (כגון NVDA, AAPL, TEVA)
- avgCost: מחיר רכישה ממוצע למניה בדולרים
- currentPrice: מחיר נוכחי למניה`;
        } else if (ocrDocType === 'keren' || ocrDocType === 'pension') {
          localPromptText = `חלץ את השווי הכולל (בשקלים) והתשואה המתוארת בדוח/צילום המסך.
החזר אך ורק JSON תקין:
{"value":number, "ytd":number}`;
        }

        const handleClientOcr = async (key: string) => {
          if (!key) throw new Error('מפתח GEMINI_API_KEY חסר. הגדר אותו תחילה בהגדרות.');
          const text = await generateGeminiContentClient(key, [
            {
              role: 'user',
              parts: [
                { text: localPromptText },
                {
                  inlineData: {
                    data: cleanBase64 || '',
                    mimeType: file.type || 'image/jpeg'
                  }
                }
              ]
            }
          ]);
          
          let cleanedText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
          const firstBracket = cleanedText.indexOf('[');
          const lastBracket = cleanedText.lastIndexOf(']');
          const firstBrace = cleanedText.indexOf('{');
          const lastBrace = cleanedText.lastIndexOf('}');

          if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            return JSON.parse(cleanedText.substring(firstBracket, lastBracket + 1));
          } else if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            return JSON.parse(cleanedText.substring(firstBrace, lastBrace + 1));
          } else {
            return JSON.parse(cleanedText);
          }
        };

        let resultData: any;
        const clientOcrResult = await handleClientOcr(customKey);
        resultData = { success: true, result: clientOcrResult };

        const data = resultData;
        if (data.success && data.result) {
          if (ocrDocType === 'stocks' && Array.isArray(data.result)) {
            const newHoldings = data.result.map((s: any, idx: number) => ({
              id: 'stk_ocr_' + Date.now() + '_' + idx,
              symbol: (s.symbol || 'STOCK').toUpperCase(),
              name: s.name || s.symbol || 'מניה שזוהתה',
              shares: parseFloat(s.shares) || 1,
              avgCost: parseFloat(s.avgCost) || parseFloat(s.currentPrice) || 100,
            }));
            if (onUpdateInvestment) {
              onUpdateInvestment({ portfolioHoldings: newHoldings });
            }
            setPreviewTxs([
              {
                id: Date.now(),
                description: `ייבוא ${newHoldings.length} מניות מצילום מסך`,
                amount: 0,
                date: new Date().toISOString().split('T')[0],
                cat: 'השקעות',
                color: '#6366F1',
                emoji: '📈',
                account: 'תיק השקעות',
              },
            ]);
          } else if ((ocrDocType === 'keren' || ocrDocType === 'pension') && typeof data.result === 'object') {
            const val = parseFloat(data.result.value) || 0;
            const ytd = parseFloat(data.result.ytd) || 0;
            if (onUpdateInvestment) {
              if (ocrDocType === 'keren') {
                onUpdateInvestment({ kerenHishtalmut: val, kerenYtdReturn: ytd });
              } else {
                onUpdateInvestment({ pensionTotal: val, pensionYtdReturn: ytd });
              }
            }
            setPreviewTxs([
              {
                id: Date.now(),
                description: `עודכן שווי ${ocrDocType === 'keren' ? 'קרן השתלמות' : 'פנסיה'}: ₪${val.toLocaleString()}`,
                amount: 0,
                date: new Date().toISOString().split('T')[0],
                cat: 'חיסכון',
                color: '#8B5CF6',
                emoji: '🛡️',
                account: 'דוח תקופתי',
              },
            ]);
          } else if (Array.isArray(data.result)) {
            const txs: Transaction[] = data.result.map((r: any, idx: number) => {
              // Find the exact category in our system (by name), fall back to keyword matching
              const aiCat = (r.cat || '').trim();
              const matchedRule = CAT_RULES.find(rule => rule.cat === aiCat);
              const catInfo = matchedRule
                ? { cat: matchedRule.cat, color: matchedRule.color, emoji: matchedRule.emoji }
                : categorize(r.description || '');
              return {
                id: Date.now() + idx + Math.random(),
                description: r.description || 'עסקה שזוהתה',
                amount: parseFloat(r.amount) || 0,
                date: r.date || new Date().toISOString().split('T')[0],
                cat: catInfo.cat,
                color: catInfo.color,
                emoji: catInfo.emoji,
                account: 'צילום מסך',
              };
            });
            setPreviewTxs(txs);
          } else {
            setErrorMsg(data.error || 'Gemini AI לא הצליח לחלץ נתונים במבנה הצפוי. נסה תמונה ברורה יותר.');
          }
        } else {
          setErrorMsg(data.error || 'Gemini AI לא הצליח לזהות נתונים בתמונה זו. נסה תמונה ברורה יותר.');
        }
      } catch (err: any) {
        console.error('OCR import error:', err);
        setErrorMsg(err.message || 'שגיאה בחיבור לשרת ה-AI. אנא ודא שהמפתח תקין בשרת.');
      } finally {
        setOcrScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmImport = () => {
    if (previewTxs.length > 0) {
      onImportTransactions(previewTxs);
      setPreviewTxs([]);
      setOcrImage(null);
      setMethod('choose');
    }
  };

  return (
    <div className="space-y-4 pb-24 text-right animate-fade-in">
      {/* Method Selection view */}
      {method === 'choose' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-extrabold text-white mb-1">ייבוא נתונים ועסקאות</h2>
            <p className="text-slate-400 text-xs">בחר את הדרך הנוחה ביותר להזנת הנתונים שלך:</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <button
                onClick={() => setMethod('excel')}
                className="bg-slate-950 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-2xl text-right transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl mb-3">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">
                  קובץ Excel / CSV
                </h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  ייבוא קובץ תנועות ישיר מכל בנקי ישראל וחברות האשראי (הפועלים, לאומי, Max, Cal).
                </p>
              </button>

              <button
                onClick={() => setMethod('ocr')}
                className="bg-slate-950 border border-slate-800 hover:border-blue-500/50 p-5 rounded-2xl text-right transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-2xl mb-3">
                  <Camera className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white text-base group-hover:text-blue-400 transition-colors">
                  סריקת תמונה / קבלה (Gemini AI)
                </h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  העלאת צילום מסך של דף תנועות או קבלה — אלגוריתם AI יחלץ את העסקאות אוטומטית!
                </p>
              </button>
            </div>
          </div>

          {/* Israeli Bank Connection Info Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0 font-bold">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">איך עובד סנכרון ישיר מול הבנק?</h4>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  חיבור ישיר לממשקי הבנקים (Open Banking) בישראל דורש רישיון ספק מידע פיננסי מבנק ישראל.
                  המערכת שלנו מאפשרת ייבוא מהיר, בטוח וחינמי 100% דרך קבצי Excel או צילומי מסך בפרטיות מלאה!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Upload Method */}
      {method === 'excel' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <button
              onClick={() => {
                setMethod('choose');
                setPreviewTxs([]);
                setErrorMsg(null);
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-bold"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span>חזור לבחירה</span>
            </button>
            <h3 className="font-bold text-white text-base">ייבוא מקובץ Excel או CSV</h3>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {previewTxs.length === 0 ? (
            <div className="space-y-4 text-center py-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-950 p-8 rounded-2xl cursor-pointer transition-all space-y-3"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-3xl mx-auto">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="font-bold text-white text-sm">
                  {fileLoading ? 'מעבד קובץ...' : 'לחץ כאן לבחירת קובץ Excel / CSV'}
                </div>
                <p className="text-slate-500 text-xs">
                  תומך בקבצים מבנק הפועלים, לאומי, דיסקונט, מזרחי, Max, Cal וכו'
                </p>
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl text-center">
                  {errorMsg}
                </div>
              )}
            </div>
          ) : (
            /* Preview of Parsed Transactions */
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl text-emerald-400 text-xs font-bold flex items-center justify-between">
                <span>{previewTxs.length} עסקאות זוהו בהצלחה!</span>
                <CheckCircle2 className="w-5 h-5" />
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                {previewTxs.slice(0, 30).map((tx, idx) => (
                  <div key={idx} className="py-2 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span>{tx.emoji}</span>
                      <span className="text-white font-medium">{tx.description}</span>
                      <span className="text-slate-500">({tx.cat})</span>
                    </div>
                    <span
                      className={`font-num font-bold ${
                        tx.amount > 0 ? 'text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      {fmtILS(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setPreviewTxs([])}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm rounded-xl transition-all cursor-pointer"
                >
                  בחר קובץ אחר
                </button>
                <button
                  onClick={confirmImport}
                  className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  ייבא {previewTxs.length} עסקאות לדשבורד ✓
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gemini Vision OCR Method */}
      {method === 'ocr' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <button
              onClick={() => {
                setMethod('choose');
                setPreviewTxs([]);
                setOcrImage(null);
                setErrorMsg(null);
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-bold"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span>חזור לבחירה</span>
            </button>
            <h3 className="font-bold text-white text-base">סריקת תמונה / צילום מסך</h3>
          </div>

          <input
            ref={ocrInputRef}
            type="file"
            accept="image/*"
            onChange={handleOcrImageUpload}
            className="hidden"
          />

          <div className="space-y-4">
            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
              {(
                [
                  ['bank', 'דף תנועות בנק'],
                  ['stocks', 'תיק מניות'],
                  ['keren', 'קרן השתלמות'],
                  ['pension', 'פנסיה'],
                ] as const
              ).map(([typeKey, label]) => (
                <button
                  key={typeKey}
                  type="button"
                  onClick={() => setOcrDocType(typeKey)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    ocrDocType === typeKey
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {previewTxs.length === 0 ? (
              <div
                onClick={() => ocrInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-blue-500/50 bg-slate-950 p-8 rounded-2xl cursor-pointer text-center space-y-3 transition-all"
              >
                <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-3xl mx-auto">
                  <Camera className="w-8 h-8" />
                </div>
                <div className="font-bold text-white text-sm">
                  {ocrScanning ? 'Gemini AI מנתח את התמונה...' : 'לחץ להעלאת צילום מסך או קבלה'}
                </div>
                <p className="text-slate-500 text-xs">
                  המערכת תשתמש ב-Gemini AI כדי לחלץ תאריכים, סכומים ושמות עסקאות
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl text-emerald-400 text-xs font-bold flex items-center justify-between">
                  <span>Gemini AI זיהה {previewTxs.length} עסקאות מהתמונה!</span>
                  <CheckCircle2 className="w-5 h-5" />
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-slate-800 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  {previewTxs.map((tx, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span>{tx.emoji}</span>
                        <span className="text-white font-medium">{tx.description}</span>
                      </div>
                      <span className="font-num font-bold text-slate-200">{fmtILS(tx.amount)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setPreviewTxs([]);
                      setOcrImage(null);
                    }}
                    className="py-3 px-4 bg-slate-800 text-slate-300 font-bold text-sm rounded-xl"
                  >
                    צלם שוב
                  </button>
                  <button
                    onClick={confirmImport}
                    className="flex-1 py-3 px-4 bg-emerald-500 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg"
                  >
                    אשר ושמור לדשבורד ✓
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl text-center">
                {errorMsg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
