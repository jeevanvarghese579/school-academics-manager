import type { Exam, Student } from '@/types';
import { formatMark } from '@/utils/calculations';

export function matchesStudentSearch(student: Student, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  return [student.name, student.rollNumber, student.admissionNumber ?? ''].some((value) => value.toLocaleLowerCase().includes(normalized));
}

export function normalExamHeader(exam: Pick<Exam, 'name' | 'maxMarks'>) {
  return { name: exam.name, maximum: `Max ${formatMark(exam.maxMarks)}` };
}
