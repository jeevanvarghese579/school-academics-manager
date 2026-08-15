import { describe, expect, it } from 'vitest';
import type { Exam, ExamMark, PlusOneMark } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { adjacentStudentIds, profileExams, profileGraphPoints, profileStatusTone, studentsByNumericRoll } from '@/utils/studentProfile';
import type { Student } from '@/types';

const exam = (id: string, classId: string, type: Exam['type'], date: string): Exam => ({ id, classId, type, name: id, date, maxMarks: 100, createdAt: '', updatedAt: '' });
const mark = (examId: string, studentId: string, marks: number | null): ExamMark => ({ id: examId + studentId, examId, studentId, classId: 'A', marks, createdAt: '', updatedAt: '' });
const plus = (examId: string, studentId: string, teMarks: number | null, ceMarks: number | null): PlusOneMark => ({ id: examId + studentId, examId, studentId, classId: 'A', teMarks, ceMarks, createdAt: '', updatedAt: '' });

describe('student profile data', () => {
  it('uses only the student class and orders exams by date', () => {
    const exams = [exam('late', 'A', 'regular', '2026-06-02'), exam('other', 'B', 'regular', '2026-01-01'), exam('early', 'A', 'regular', '2026-05-02')];
    expect(profileExams(exams, 'A').map((entry) => entry.id)).toEqual(['early', 'late']);
  });

  it('uses one Plus One TE percentage point, in chronological order, without missing-mark zeroes', () => {
    const exams = [exam('regular', 'A', 'regular', '2026-05-02'), exam('missing', 'A', 'regular', '2026-05-03'), exam('plus', 'A', 'plusOne', '2026-06-02')];
    const points = profileGraphPoints(exams, 'A', 'student', [mark('regular', 'student', 50), mark('missing', 'student', null)], [plus('plus', 'student', 60, 20)], DEFAULT_SETTINGS);
    expect(points).toHaveLength(2);
    expect(points[0].percentage).toBe(50);
    expect(points[1]).toMatchObject({ source: 'Plus One TE', percentage: 75 });
    expect(points).toEqual(expect.not.arrayContaining([expect.objectContaining({ plusOneTotalPercentage: expect.anything() })]));
  });

  it('sorts navigation by numeric roll number and has first/last boundaries', () => {
    const students = ['1', '10', '2', '3'].map((rollNumber) => ({ id: rollNumber, rollNumber, name: rollNumber, classId: 'A', createdAt: '', updatedAt: '' })) as Student[];
    expect(studentsByNumericRoll(students).map((student) => student.rollNumber)).toEqual(['1', '2', '3', '10']);
    expect(adjacentStudentIds(students, '1')).toEqual({ previous: null, next: '2' });
    expect(adjacentStudentIds(students, '10')).toEqual({ previous: '3', next: null });
  });

  it('maps calculated statuses to the intended card colors', () => {
    expect(profileStatusTone('achieved')).toBe('success');
    expect(profileStatusTone('not-achieved')).toBe('warning');
    expect(profileStatusTone('feasible')).toBe('warning');
    expect(profileStatusTone('not-eligible')).toBe('danger');
    expect(profileStatusTone('impossible')).toBe('danger');
    expect(profileStatusTone('incomplete')).toBe('neutral');
  });
});
