import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function useStatisticalData() {
  const data = useQuery(api.statisticalData.list);
  return {
    data: data ?? [],
    isLoading: data === undefined,
    isError: false,
    error: null,
  };
}

export function useAuditLogs() {
  const data = useQuery(api.auditLog.list);
  return {
    data: data ?? [],
    isLoading: data === undefined,
    isError: false,
    error: null,
  };
}

export function canEdit(user) {
  return user?.role === "admin" || user?.role === "data_entry";
}

export function canDelete(user) {
  return user?.role === "admin";
}

export function canImport(user) {
  return user?.role === "admin" || user?.role === "data_entry";
}
