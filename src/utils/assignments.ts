import type { Assignment, Student } from '@/types';

export type AssignmentStudentSort = 'roll' | 'name' | 'status';
export type SortDirection = 'asc' | 'desc';

export const isFeeAssignment = (assignment: Assignment) => assignment.isFee === true;

export function sortAssignmentStudents(
  students: Student[],
  statuses: Map<string, boolean>,
  sort: AssignmentStudentSort,
  direction: SortDirection,
) {
  return [...students].sort((a, b) => {
    let comparison = 0;
    if (sort === 'roll') {
      comparison = a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true });
    } else if (sort === 'name') {
      comparison = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    } else {
      comparison = Number(statuses.get(a.id) ?? false) - Number(statuses.get(b.id) ?? false);
    }
    if (comparison === 0) {
      comparison = a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true });
    }
    return direction === 'asc' ? comparison : -comparison;
  });
}
