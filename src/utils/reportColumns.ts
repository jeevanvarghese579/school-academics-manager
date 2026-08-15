import type { Exam } from "@/types";

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
