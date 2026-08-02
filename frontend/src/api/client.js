const BASE = "/api/finance";

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "שגיאת שרת");
  }
  return res.json();
}

export const api = {
  upload: (file) => {
    const form = new FormData();
    form.append("file", file);
    return req("/upload", { method: "POST", body: form });
  },
  analyze: (batchId) => req(`/analyze/${batchId}`, { method: "POST" }),
  transactions: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    return req(`/transactions?${q}`);
  },
  summary: (month) => req(`/summary/${month}`),
  recurring: () => req("/recurring"),
  anomalies: () => req("/anomalies"),
  recommendations: () => req("/recommendations"),
  categories: () => req("/categories"),
};
