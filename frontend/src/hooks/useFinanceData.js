import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import toast from "react-hot-toast";

export function useTransactions(filters = {}) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: () => api.transactions(filters),
  });
}

export function useSummary(month) {
  return useQuery({
    queryKey: ["summary", month],
    queryFn: () => api.summary(month),
    enabled: !!month,
  });
}

export function useRecurring() {
  return useQuery({ queryKey: ["recurring"], queryFn: api.recurring });
}

export function useAnomalies() {
  return useQuery({ queryKey: ["anomalies"], queryFn: api.anomalies });
}

export function useRecommendations() {
  return useQuery({ queryKey: ["recommendations"], queryFn: api.recommendations });
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: api.categories });
}

export function useUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.upload,
    onSuccess: () => {
      toast.success("הקובץ הועלה בהצלחה");
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useAnalyze() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.analyze,
    onSuccess: () => {
      toast.success("ניתוח AI הושלם");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error("שגיאה בניתוח AI: " + e.message),
  });
}
