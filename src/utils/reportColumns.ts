import type { CombinedAnalysis, Exam } from "@/types";

export function combinedAnalysisDate(
  analysis: Pick<CombinedAnalysis, "examIds" | "date">,
  exams: Exam[],
) {
  const referencedDates = analysis.examIds
    .map((examId) => exams.find((exam) => exam.id === examId)?.date)
    .filter((date): date is string => Boolean(date));
  return referencedDates.sort((a, b) => b.localeCompare(a))[0] ?? analysis.date ?? "";
}

export function classReportExamSchema(exams: Exam[], classId: string) {
  const classExams = exams.filter((exam) => exam.classId === classId);
  return {
    regular: classExams.filter((exam) => exam.type === "regular").sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    }),
    hasPlusOne: classExams.some((exam) => exam.type === "plusOne"),
  };
}
