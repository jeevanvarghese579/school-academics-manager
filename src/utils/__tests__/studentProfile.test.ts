import { describe, expect, it } from 'vitest';
import type { Exam, ExamMark, PlusOneMark } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { profileExams, profileGraphPoints } from '@/utils/studentProfile';

const exam = (id: string, classId: string, type: Exam['type'], date: string): Exam => ({ id, classId, type, name: id, date, maxMarks: 100, createdAt: '', updatedAt: '' });
const mark = (examId: string, studentId: string, marks: number | null): ExamMark => ({ id: examId + studentId, examId, studentId, classId: 'A', marks, createdAt: '', updatedAt: '' });
const plus = (examId: string, studentId: string, teMarks: number | null, ceMarks: number | null): PlusOneMark => ({ id: examId + studentId, examId, studentId, classId: 'A', teMarks, ceMarks, createdAt: '', updatedAt: '' });

describe('student profile data', () => {
  it('uses only the student class and orders exams by date', () => {
    const exams = [exam('late', 'A', 'regular', '2026-06-02'), exam('other', 'B', 'regular', '2026-01-01'), exam('early', 'A', 'regular', '2026-05-02')];
    expect(profileExams(exams, 'A').map((entry) => entry.id)).toEqual(['early', 'late']);
  });

  it('omits missing marks instead of creating zero graph points and includes Plus One marks', () => {
    const exams = [exam('regular', 'A', 'regular', '2026-05-02'), exam('missing', 'A', 'regular', '2026-05-03'), exam('plus', 'A', 'plusOne', '2026-06-02')];
    const points = profileGraphPoints(exams, 'A', 'student', [mark('regular', 'student', 50), mark('missing', 'student', null)], [plus('plus', 'student', 60, 20)], DEFAULT_SETTINGS);
    expect(points).toHaveLength(2);
    expect(points[0].normalPercentage).toBe(50);
    expect(points[1].plusOneTotalPercentage).toBe(80);
  });
});
