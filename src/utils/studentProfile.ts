import type { Exam, ExamMark, PlusOneMark } from '@/types';
import { calcPercentage, calcPlusOneResult } from '@/utils/calculations';

/** Profile data is deliberately scoped to the student's class, so historic marks never leak in. */
export function profileExams(exams: Exam[], classId: string) {
  return exams.filter((exam) => exam.classId === classId).sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

export function profileGraphPoints(
  exams: Exam[], classId: string, studentId: string, marks: ExamMark[], plusMarks: PlusOneMark[], settings: Parameters<typeof calcPlusOneResult>[2],
) {
  return profileExams(exams, classId).flatMap((exam) => {
    if (exam.type === 'regular') {
      const mark = marks.find((entry) => entry.examId === exam.id && entry.studentId === studentId)?.marks ?? null;
      const percentage = calcPercentage(mark, exam.maxMarks);
      return percentage === null ? [] : [{ label: exam.name, date: exam.date, normalPercentage: percentage, plusOneTEPercentage: null as number | null, plusOneTotalPercentage: null as number | null }];
    }
    const mark = plusMarks.find((entry) => entry.examId === exam.id && entry.studentId === studentId);
    if (!mark || (mark.teMarks === null && mark.ceMarks === null)) return [];
    const result = calcPlusOneResult(mark.teMarks, mark.ceMarks, settings);
    return [{ label: exam.name, date: exam.date, normalPercentage: null as number | null, plusOneTEPercentage: result.tePercentage, plusOneTotalPercentage: result.percentage }];
  });
}
