import type { Exam } from '@/types';

function dateValue(date: string | undefined): number | null {
  if (!date) return null;
  const value = new Date(`${date}T00:00:00`).getTime();
  return Number.isNaN(value) ? null : value;
}

/** Oldest first; undated/invalid dates last, with IDs making equal dates deterministic. */
export function sortExamsChronologically(exams: Exam[]): Exam[] {
  return [...exams].sort((a, b) => {
    const aDate = dateValue(a.date); const bDate = dateValue(b.date);
    if (aDate === null && bDate === null) return a.id.localeCompare(b.id);
    if (aDate === null) return 1;
    if (bDate === null) return -1;
    return aDate - bDate || a.id.localeCompare(b.id);
  });
}
