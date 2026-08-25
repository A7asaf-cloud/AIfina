import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useSummary } from "../../hooks/useFinanceData";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

function prevMonth(m) {
  const [y, mo] = m.split("-").map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
}
function nextMonth(m) {
  const [y, mo] = m.split("-").map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
}
function fmtMonth(m) {
  const [y, mo] = m.split("-");
  return new Date(+y, +mo - 1).toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}

export default function MonthlySummaryCard() {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const { data: summary = {}, isLoading } = useSummary(month);

  const chartData = (summary.top_categories || []).map((c) => ({ name: c.category, value: Math.abs(c.total) }));
  const income = summary.total_income || 0;
  const expenses = Math.abs(summary.total_expenses || 0);
  const savingsRate = summary.savings_rate || 0;

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setMonth(prevMonth(month))} className="p-2 rounded-full hover:bg-gray-200 text-gray-600 text-lg">→</button>
        <h2 className="text-xl font-semibold text-gray-800 w-48 text-center">{fmtMonth(month)}</h2>
        <button onClick={() => setMonth(nextMonth(month))} className="p-2 rounded-full hover:bg-gray-200 text-gray-600 text-lg">←</button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">טוען סיכום...</div>
      ) : !income && !expenses ? (
        <div className="text-center py-12 text-gray-400">אין נתונים לחודש זה — הפעל ניתוח AI תחילה</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stats */}
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm text-green-600 font-medium">סך הכנסות</p>
              <p className="text-2xl font-bold text-green-700">₪{income.toLocaleString("he-IL")}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-600 font-medium">סך הוצאות</p>
              <p className="text-2xl font-bold text-red-700">₪{expenses.toLocaleString("he-IL")}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-600 font-medium">שיעור חיסכון</p>
              <p className="text-2xl font-bold text-blue-700">{savingsRate.toFixed(1)}%</p>
            </div>
            {summary.biggest_expense && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-sm text-gray-500">ההוצאה הגדולה ביותר</p>
                <p className="font-medium text-gray-800 truncate">{summary.biggest_expense.description}</p>
                <p className="text-red-600 font-bold">₪{Math.abs(summary.biggest_expense.amount).toLocaleString("he-IL")}</p>
              </div>
            )}
          </div>

          {/* Donut chart */}
          {chartData.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-600 mb-2">התפלגות הוצאות לפי קטגוריה</p>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={2}>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `₪${Number(v).toLocaleString("he-IL")}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
