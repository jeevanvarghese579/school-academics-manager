import { describe, expect, it } from 'vitest';
import type { Assignment, Student } from '@/types';
import { isFeeAssignment, sortAssignmentStudents } from '@/utils/assignments';

const entity = { createdAt: '', updatedAt: '' };
const students: Student[] = [
  { ...entity, id: 'a', classId: 'c', rollNumber: '10', name: 'Anu' },
  { ...entity, id: 'b', classId: 'c', rollNumber: '2', name: 'Beena' },
];

describe('assignment and fee presentation', () => {
  it('treats legacy assignments without isFee as assignments', () => {
    const legacy = { ...entity, id: 'x', classId: 'c', title: 'Work', dueDate: '' } as Assignment;
    expect(isFeeAssignment(legacy)).toBe(false);
    expect(isFeeAssignment({ ...legacy, isFee: true })).toBe(true);
  });

  it('sorts student rows by clickable fields', () => {
    const statuses = new Map([['a', true], ['b', false]]);
    expect(sortAssignmentStudents(students, statuses, 'roll', 'asc').map((s) => s.id)).toEqual(['b', 'a']);
    expect(sortAssignmentStudents(students, statuses, 'name', 'desc').map((s) => s.id)).toEqual(['b', 'a']);
    expect(sortAssignmentStudents(students, statuses, 'status', 'asc').map((s) => s.id)).toEqual(['b', 'a']);
  });
});
