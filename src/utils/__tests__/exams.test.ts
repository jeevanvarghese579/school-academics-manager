import { describe, expect, it } from 'vitest';
import { sortExamsChronologically } from '@/utils/exams';
import type { Exam } from '@/types';

const exam = (id: string, date: string): Exam => ({ id, date, name: id, classId: 'class', maxMarks: 100, type: 'regular', createdAt: '', updatedAt: '' });

describe('sortExamsChronologically', () => {
  it('orders exams from oldest date to newest, using IDs for equal dates', () => {
    expect(sortExamsChronologically([exam('z', '2026-02-01'), exam('b', '2026-01-01'), exam('a', '2026-01-01')]).map(x => x.id)).toEqual(['a', 'b', 'z']);
  });
  it('places missing or invalid dates after valid dates safely', () => {
    expect(sortExamsChronologically([exam('missing', ''), exam('dated', '2026-01-01'), exam('invalid', 'not-a-date')]).map(x => x.id)).toEqual(['dated', 'invalid', 'missing']);
  });
});
