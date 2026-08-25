import { useState } from "react";
import { useAnomalies } from "../../hooks/useFinanceData";

const SEVERITY = {
  high:   { bg: "bg-red-50 border-red-300",    badge: "bg-red-100 text-red-800",    icon: "🔴", label: "גבוה" },
  medium: { bg: "bg-orange-50 border-orange-300", badge: "bg-orange-100 text-orange-800", icon: "🟠", label: "בינוני" },
  low:    { bg: "bg-yellow-50 border-yellow-300", badge: "bg-yellow-100 text-yellow-800", icon: "🟡", label: "נמוך" },
};

export default function AnomalyAlert() {
  const { data: anomalies = [], isLoading } = useAnomalies();
  const [dismissed, setDismissed] = useState(new Set());

  const visible = anomalies.filter((a) => !dismissed.has(a.transaction_id));

  if (isLoading) return <div className="text-center py-12 text-gray-400">טוען חריגות...</div>;

  if (anomalies.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">✅</div>
        <p>לא נמצאו חריגות — הפעל ניתוח AI תחילה</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">חריגות שזוהו</h2>
        <span className="text-sm text-gray-500">{visible.length} / {anomalies.length} פעילות</span>
      </div>
      {visible.map((a) => {
        const s = SEVERITY[a.severity] || SEVERITY.low;
        return (
          <div key={a.transaction_id} className={`border rounded-xl p-4 flex items-start gap-3 ${s.bg}`}>
            <span className="text-xl mt-0.5">{s.icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badge}`}>{s.label}</span>
                <span className="text-xs text-gray-500">עסקה #{a.transaction_id}</span>
              </div>
              <p className="text-gray-800 text-sm">{a.reason}</p>
            </div>
            <button
              onClick={() => setDismissed((d) => new Set([...d, a.transaction_id]))}
              className="text-gray-400 hover:text-gray-600 text-sm px-2 py-1 rounded hover:bg-white/60 transition-colors shrink-0"
            >
              בטל
            </button>
          </div>
        );
      })}
    </div>
  );
}
