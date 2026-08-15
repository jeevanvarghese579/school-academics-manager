import { describe, expect, it } from 'vitest';
import { matchesStudentSearch, normalExamHeader } from '@/utils/reportPresentation';

const student = { id: 's', classId: 'c', name: 'Anu Thomas', rollNumber: '10', admissionNumber: 'ADM-42', createdAt: '', updatedAt: '' };

describe('class report presentation', () => {
  it('searches name, numeric roll, and admission number case-insensitively', () => {
    expect(matchesStudentSearch(student, 'anu')).toBe(true);
    expect(matchesStudentSearch(student, '10')).toBe(true);
    expect(matchesStudentSearch(student, 'adm-42')).toBe(true);
    expect(matchesStudentSearch(student, 'missing')).toBe(false);
  });
  it('keeps a compact maximum-mark header and raw obtained mark values', () => {
    expect(normalExamHeader({ name: 'C1', maxMarks: 15 })).toEqual({ name: 'C1', maximum: 'Max 15' });
    expect(8).toBe(8);
    const missing: number | null = null;
    expect(missing ?? '—').toBe('—');
  });
  it('can be combined with numeric exam sorting without changing missing values', () => {
    const rows = [
      { student: { ...student, name: 'Anu', rollNumber: '2' }, mark: 8 },
      { student: { ...student, name: 'Anu B', rollNumber: '10' }, mark: null },
      { student: { ...student, name: 'Binu', rollNumber: '1' }, mark: 14 },
    ];
    const shown = rows.filter((row) => matchesStudentSearch(row.student, 'anu')).sort((a, b) => (a.mark ?? -1) - (b.mark ?? -1));
    expect(shown.map((row) => row.mark ?? '—')).toEqual(['—', 8]);
  });
});
