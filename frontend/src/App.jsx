import { useState } from "react";
import FileUpload from "./components/finance/FileUpload";
import TransactionTable from "./components/finance/TransactionTable";
import MonthlySummaryCard from "./components/finance/MonthlySummaryCard";
import AnomalyAlert from "./components/finance/AnomalyAlert";
import RecommendationPanel from "./components/finance/RecommendationPanel";

const TABS = [
  { id: "upload", label: "העלאה" },
  { id: "transactions", label: "עסקאות" },
  { id: "summary", label: "סיכום חודשי" },
  { id: "anomalies", label: "חריגות" },
  { id: "recommendations", label: "המלצות" },
];

export default function App() {
  const [tab, setTab] = useState("upload");

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">מנתח פיננסי חכם</h1>
          <p className="text-sm text-gray-500 mt-1">ייבוא ניתוח AI של נתוני בנק ואשראי ישראלי</p>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-1 pb-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                tab === t.id
                  ? "text-blue-600 border-blue-600 bg-blue-50"
                  : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === "upload" && <FileUpload />}
        {tab === "transactions" && <TransactionTable />}
        {tab === "summary" && <MonthlySummaryCard />}
        {tab === "anomalies" && <AnomalyAlert />}
        {tab === "recommendations" && <RecommendationPanel />}
      </main>
    </div>
  );
}
