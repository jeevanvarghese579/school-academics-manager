import type { Exam, ExamMark, PlusOneMark, Student } from '@/types';
import { calcPercentage, calcPlusOneResult } from '@/utils/calculations';

/** Profile data is deliberately scoped to the student's class, so historic marks never leak in. */
export function profileExams(exams: Exam[], classId: string) {
  return exams.filter((exam) => exam.classId === classId).sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

export function studentsByNumericRoll(students: Student[]) {
  return [...students].sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }) || a.name.localeCompare(b.name));
}

export function adjacentStudentIds(students: Student[], studentId: string) {
  const ordered = studentsByNumericRoll(students); const index = ordered.findIndex((student) => student.id === studentId);
  return { previous: index > 0 ? ordered[index - 1].id : null, next: index >= 0 && index < ordered.length - 1 ? ordered[index + 1].id : null };
}

export type ProfileStatusTone = 'success' | 'warning' | 'danger' | 'neutral';

/** Presentation follows the status already calculated by calcPlusOneResult; it never recalculates marks. */
export function profileStatusTone(status: string): ProfileStatusTone {
  if (status === 'achieved') return 'success';
  if (status === 'not-achieved') return 'warning';
  if (status === 'not-eligible' || status === 'impossible') return 'danger';
  return 'neutral';
}

export function profileGraphPoints(exams: Exam[], classId: string, studentId: string, marks: ExamMark[], plusMarks: PlusOneMark[], settings: Parameters<typeof calcPlusOneResult>[2]) {
  return profileExams(exams, classId).flatMap((exam) => {
    if (exam.type === 'regular') {
      const mark = marks.find((entry) => entry.examId === exam.id && entry.studentId === studentId)?.marks ?? null;
      const percentage = calcPercentage(mark, exam.maxMarks);
      return percentage === null ? [] : [{ label: exam.name, date: exam.date, percentage, source: 'Normal exam' }];
    }
    const mark = plusMarks.find((entry) => entry.examId === exam.id && entry.studentId === studentId);
    if (!mark || mark.teMarks === null) return [];
    const tePercentage = calcPlusOneResult(mark.teMarks, mark.ceMarks, settings).tePercentage;
    return tePercentage === null ? [] : [{ label: exam.name, date: exam.date, percentage: tePercentage, source: 'Plus One TE' }];
  });
}
