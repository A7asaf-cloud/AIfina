import { useState } from "react";
import { useTransactions } from "../../hooks/useFinanceData";
import CategoryFilter from "./CategoryFilter";

const SEVERITY_COLOR = { low: "bg-yellow-100 text-yellow-800", medium: "bg-orange-100 text-orange-800", high: "bg-red-100 text-red-800" };

function Badge({ text }) {
  if (!text) return null;
  return (
    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
      {text}
    </span>
  );
}

export default function TransactionTable() {
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  const { data, isLoading } = useTransactions({ month, category, search, page });
  const transactions = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 50;
  const totalPages = Math.ceil(total / perPage);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const sorted = [...transactions].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (sortKey === "amount") { av = +av; bv = +bv; }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const SortBtn = ({ k, label }) => (
    <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-blue-600">
      {label} {sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl border border-gray-200">
        <input
          type="month"
          value={month}
          onChange={(e) => { setMonth(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <CategoryFilter value={category} onChange={(v) => { setCategory(v); setPage(1); }} />
        <input
          type="text"
          placeholder="חיפוש תיאור..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-500 mr-auto">{total} עסקאות</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-gray-400">טוען עסקאות...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600"><SortBtn k="date" label="תאריך" /></th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">תיאור</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600"><SortBtn k="amount" label="סכום" /></th>
                <th className="text-right px-4 py-3 font-medium text-gray-600"><SortBtn k="ai_category" label="קטגוריה" /></th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">חריג</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{tx.date}</td>
                  <td className="px-4 py-3 text-gray-800 max-w-xs truncate">{tx.description}</td>
                  <td className={`px-4 py-3 font-medium tabular-nums whitespace-nowrap ${tx.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                    {tx.amount < 0 ? "-" : "+"}₪{Math.abs(tx.amount).toLocaleString("he-IL", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3"><Badge text={tx.ai_category} /></td>
                  <td className="px-4 py-3">
                    {tx.anomaly_score > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        tx.anomaly_score >= 1 ? SEVERITY_COLOR.high : tx.anomaly_score >= 0.6 ? SEVERITY_COLOR.medium : SEVERITY_COLOR.low
                      }`}>
                        {tx.anomaly_score >= 1 ? "גבוה" : tx.anomaly_score >= 0.6 ? "בינוני" : "נמוך"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">אין עסקאות להצגה</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-100">
            הקודם
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-100">
            הבא
          </button>
        </div>
      )}
    </div>
  );
}
