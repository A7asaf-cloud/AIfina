# CLAUDE.md — AIfina (FinanceIL)

## חוקים קשיחים — אסור לגעת
- `server.ts` וכל קובץ ב-`server/`
- `finance-scraper/` ו-`backend/`
- `.env` / `.env.example`
- dependencies ב-`package.json` (אין הוספת ספריות — charts ב-SVG/CSS טהור)
- לוגיקת auth — שינויי UI בלבד

כל העבודה: **frontend בלבד, בתוך `src/`** (+ `index.html`).

## סדר עבודה
לפני כל שינוי — משפט אחד מה הולך להתבצע.

## Design System — RiseUp Style

### צבעים — Tailwind tokens ב-`@theme` ב-index.css
| שימוש | token class | ערך |
|---|---|---|
| רקע ראשי | `bg-surface` | `#F7F8FA` |
| כרטיסים | `bg-card` | `#FFFFFF` |
| ירוק (הכנסה) | `text-income` / `bg-income` | `#00C48C` |
| אדום (הוצאה) | `text-expense` / `bg-expense` | `#FF647C` |
| כחול ראשי | `bg-primary` / `text-primary` | `#4A6FFF` |
| סגול משני | `bg-secondary` | `#9B59B6` |
| אפור טקסט | `text-muted` | `#8E9BB5` |
| שחור כותרת | `text-ink` | `#1A1D2E` |
| גבול עדין | `border-line` | `#EDF0F7` |

Skeleton: `.skeleton` (shimmer). מותר גם arbitrary `text-[#1A1D2E]` — אבל להעדיף tokens.

### טיפוגרפיה
- כותרות: `font-bold text-xl text-ink`
- סכומים גדולים: `font-black text-3xl`
- תיאורים: `text-sm text-muted` (מינימום text-sm לטקסט ראשי)
- מספרים: תמיד tabular/LTR — המחלקה `.font-num` או `<span dir="ltr">`

### כרטיסים
`rounded-2xl shadow-sm border border-line bg-card p-4` — מינימום p-4, shadow-sm בלבד.

### כפתורים ראשיים
`h-12 rounded-xl font-semibold` מינימום. Dividers: `border-line`. Icons: lucide-react `w-5 h-5`.

### RTL
- `index.html`: `<html lang="he" dir="rtl">`
- מספרים/תאריכים תמיד LTR ב-span מקופל
- progress bars מתמלאים מימין לשמאל
- Bottom nav: `fixed bottom-0 z-50 bg-card border-t border-line pb-safe`

## טכנולוגיה
React 19, Tailwind v4 (`@import "tailwindcss"`), lucide-react, motion (`import { motion } from 'motion'`)

## קונבנציות קוד
- Formatters: `src/utils/formatters.ts` — fmtILS/fmtUSD/fmtDate/fmtFullDate/getMonthKey
- קטגוריות: `src/utils/categories.ts` — CATEGORIES, DEFAULT_BUDGET_PLAN, calcBudget(), spentPerBudget()
- טאבים (5): dashboard | transactions | budget | investments | settings
- Loading states: skeleton אפור מהבהב; שגיאות: toast בעברית (showToast/showToastError מ-ui.tsx)
- Data flow: כל ה-handlers ב-`App.tsx`, מוזרמים כ-props
