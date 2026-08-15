import { describe, expect, it } from 'vitest';
import { makeFullBackup, validateFullBackup } from '@/utils/backup';
import { removeUndefinedValues } from '@/utils/firestore';
import type { BackupData } from '@/types';

const data: BackupData = { version: '1.0.3', exportedAt: '2026-08-15T00:00:00.000Z', settings: null, classes: [{ id: 'c', name: 'Class', division: 'A', academicYear: '2026', createdAt: '', updatedAt: '' }], students: [{ id: 's', classId: 'c', rollNumber: '1', name: 'Student', createdAt: '', updatedAt: '' }], exams: [{ id: 'e', classId: 'c', name: 'Exam', date: '', maxMarks: 100, type: 'regular', createdAt: '', updatedAt: '' }], examMarks: [{ id: 'm', examId: 'e', studentId: 's', classId: 'c', marks: null, createdAt: '', updatedAt: '' }], plusOneMarks: [], assignments: [], assignmentStatuses: [], graceMarks: [], combinedAnalyses: [] };

describe('Firestore sanitization', () => {
  it('removes undefined values recursively without changing null or arrays', () => expect(removeUndefinedValues({ name: 'A', admissionNumber: undefined, nested: { notes: undefined, value: null }, list: [{ optional: undefined, id: 1 }] })).toEqual({ name: 'A', nested: { value: null }, list: [{ id: 1 }] }));
});
describe('full backup validation', () => {
  it('preserves IDs and accepts valid relationships', () => expect(validateFullBackup(makeFullBackup(data)).data.students[0].id).toBe('s'));
  it('rejects unsupported future schemas before a restore', () => expect(() => validateFullBackup({ ...makeFullBackup(data), schemaVersion: 2 })).toThrow('Unsupported'));
  it('rejects broken relationships before a restore', () => expect(() => validateFullBackup(makeFullBackup({ ...data, students: [{ ...data.students[0], classId: 'missing' }] }))).toThrow('relationships'));
});
