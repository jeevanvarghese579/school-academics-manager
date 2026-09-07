import { describe, expect, it } from 'vitest';
import type { Exam } from '@/types';
import { classReportExamSchema, combinedAnalysisDate } from '@/utils/reportColumns';

const exam = (id: string, classId: string, type: Exam['type'], date = ''): Exam => ({ id, classId, type, name: id, date, maxMarks: 100, createdAt: '', updatedAt: '' });
const exams = [exam('plus-one', 'A', 'plusOne'), exam('a', 'A', 'regular'), exam('b', 'B', 'regular'), exam('c', 'B', 'regular')];

describe('class report exam schema', () => {
  it('only exposes Plus One columns for the selected class', () => {
    expect(classReportExamSchema(exams, 'A').hasPlusOne).toBe(true);
    expect(classReportExamSchema(exams, 'B').hasPlusOne).toBe(false);
  });
  it('rebuilds only the selected class exam columns when switching classes', () => {
    expect(classReportExamSchema(exams, 'A').regular.map(x => x.id)).toEqual(['a']);
    expect(classReportExamSchema(exams, 'B').regular.map(x => x.id)).toEqual(['b', 'c']);
    expect(classReportExamSchema(exams, 'A').regular.map(x => x.id)).toEqual(['a']);
  });
  it('orders normal exam columns by date and puts missing dates last', () => {
    const ordered = classReportExamSchema([exam('late', 'A', 'regular', '2026-06-01'), exam('undated', 'A', 'regular'), exam('early', 'A', 'regular', '2026-05-01')], 'A');
    expect(ordered.regular.map(x => x.id)).toEqual(['early', 'late', 'undated']);
  });
});

describe('combinedAnalysisDate', () => {
  it('uses the latest date among the referenced exams', () => {
    const datedExams = [
      exam('first', 'A', 'regular', '2026-08-19'),
      exam('second', 'A', 'regular', '2026-09-02'),
      exam('unrelated', 'A', 'regular', '2026-10-10'),
    ];
    expect(combinedAnalysisDate({ examIds: ['first', 'second'], date: '2026-01-01' }, datedExams)).toBe('2026-09-02');
  });

  it('falls back to the stored date when referenced exams are unavailable', () => {
    expect(combinedAnalysisDate({ examIds: ['missing'], date: '2026-09-02' }, [])).toBe('2026-09-02');
  });
});
