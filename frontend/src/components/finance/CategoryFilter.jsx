import { useCategories } from "../../hooks/useFinanceData";

export default function CategoryFilter({ value, onChange }) {
  const { data: categories = [] } = useCategories();

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">כל הקטגוריות</option>
      {categories.map((c) => (
        <option key={c.category} value={c.category}>
          {c.category} ({c.count})
        </option>
      ))}
    </select>
  );
}
