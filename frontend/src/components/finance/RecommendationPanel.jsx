import { useState } from "react";
import { useRecommendations } from "../../hooks/useFinanceData";

const ICONS = ["💡", "✂️", "📉", "🛒", "📱"];

function Card({ rec, index }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-right hover:bg-gray-50 transition-colors"
      >
        <span className="text-2xl">{ICONS[index % ICONS.length]}</span>
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{rec.title}</p>
          <p className="text-sm text-green-600 font-medium">
            חיסכון משוער: ₪{Number(rec.estimated_saving_nis).toLocaleString("he-IL")} / חודש
          </p>
        </div>
        <span className="text-gray-400 text-lg">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
          {rec.description}
        </div>
      )}
    </div>
  );
}

export default function RecommendationPanel() {
  const { data, isLoading } = useRecommendations();
  const recs = data?.recommendations ?? [];

  if (isLoading) return <div className="text-center py-12 text-gray-400">טוען המלצות...</div>;

  if (recs.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">💬</div>
        <p>אין המלצות עדיין — הפעל ניתוח AI תחילה</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">המלצות לחיסכון</h2>
      {recs.map((rec, i) => <Card key={i} rec={rec} index={i} />)}
    </div>
  );
}
