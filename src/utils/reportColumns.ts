import type { Exam } from '@/types';

export function classReportExamSchema(exams: Exam[], classId: string) {
  const classExams = exams.filter(exam => exam.classId === classId);
  return {
    regular: classExams.filter(exam => exam.type === 'regular'),
    hasPlusOne: classExams.some(exam => exam.type === 'plusOne'),
  };
}
