import { formatMark, formatPercent } from "@/utils/calculations";

export type AcademicResultMode = "marks" | "percentage";

export function formatAcademicResult(mode: AcademicResultMode, marks: number | null, percentage: number | null, decimals: number) {
  if (marks === null || percentage === null) return "—";
  return mode === "marks" ? formatMark(marks) : formatPercent(percentage, decimals);
}

/** Sort using the displayed metric's numeric source, never its formatted text. */
export function academicResultSortValue(mode: AcademicResultMode, marks: number | null, percentage: number | null) {
  return (mode === "marks" ? marks : percentage) ?? -1;
}

export function percentageResultTone(percentage: number | null, requiredPercent: number) {
  if (percentage === null) return "neutral";
  return percentage < requiredPercent ? "failed" : "normal";
}
