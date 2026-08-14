import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  previewStudentImport,
  previewRollNumberImport,
  previewMarksImport,
  studentsToCsv,
  blankStudentTemplate,
  previewStudentCsvImport,
} from '@/utils/csv';
import type { Student } from '@/types';

const mockStudents: Student[] = [
  { id: 'uuid-1', classId: 'cls-1', rollNumber: '1', name: 'Alice', admissionNumber: 'ADM001', notes: '', createdAt: '', updatedAt: '' },
  { id: 'uuid-2', classId: 'cls-1', rollNumber: '2', name: 'Bob', admissionNumber: 'ADM002', notes: '', createdAt: '', updatedAt: '' },
];

describe('parseCsv', () => {
  it('parses simple CSV', () => {
    const rows = parseCsv('student_id,roll_number,name,admission_number\nuuid-1,1,Alice,ADM001');
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Alice');
  });

  it('handles commas in quoted names', () => {
    const rows = parseCsv('student_id,roll_number,name\n,3,"Smith, John"');
    expect(rows[0].name).toBe('Smith, John');
  });

  it('handles empty lines', () => {
    const rows = parseCsv('student_id,roll_number,name\n\n,1,Alice');
    expect(rows).toHaveLength(1);
  });

  it('handles Windows line endings', () => {
    const rows = parseCsv('student_id,roll_number,name\r\nuuid-1,1,Alice\r\n');
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Alice');
  });
});

describe('previewStudentImport', () => {
  it('detects new students to create', () => {
    const csv = 'student_id,roll_number,name,admission_number\n,3,Charlie,ADM003';
    const rows = parseCsv(csv);
    const preview = previewStudentImport(rows, mockStudents);
    expect(preview.toCreate).toHaveLength(1);
    expect(preview.toCreate[0].name).toBe('Charlie');
  });

  it('detects updates to existing students by ID', () => {
    const csv = 'student_id,roll_number,name,admission_message\nuuid-1,1,AliceUpdated,ADM001';
    const rows = parseCsv('student_id,roll_number,name,admission_number\nuuid-1,1,AliceUpdated,ADM001');
    const preview = previewStudentImport(rows, mockStudents);
    expect(preview.toUpdate).toHaveLength(1);
    expect(preview.toUpdate[0].name).toBe('AliceUpdated');
  });

  it('detects unchanged rows', () => {
    const rows = parseCsv('student_id,roll_number,name,admission_number\nuuid-1,1,Alice,ADM001');
    const preview = previewStudentImport(rows, mockStudents);
    expect(preview.unchanged).toHaveLength(1);
  });

  it('flags invalid rows with missing name', () => {
    const rows = parseCsv('student_id,roll_number,name,admission_number\n,3,,');
    const preview = previewStudentImport(rows, mockStudents);
    expect(preview.invalid).toHaveLength(1);
  });

  it('flags duplicate student IDs', () => {
    const csv = 'student_id,roll_number,name,admission_number\nuuid-1,1,Alice,ADM001\nuuid-1,1,Alice,ADM001';
    const rows = parseCsv(csv);
    const preview = previewStudentImport(rows, mockStudents);
    expect(preview.duplicates.length).toBeGreaterThanOrEqual(1);
  });
});

describe('previewRollNumberImport', () => {
  it('detects roll number changes', () => {
    const rows = parseCsv('student_id,name,roll_number\nuuid-1,Alice,5');
    const preview = previewRollNumberImport(rows, mockStudents);
    expect(preview.toUpdate).toHaveLength(1);
    expect(preview.toUpdate[0].roll_number).toBe('5');
  });

  it('detects unchanged roll numbers', () => {
    const rows = parseCsv('student_id,name,roll_number\nuuid-1,Alice,1');
    const preview = previewRollNumberImport(rows, mockStudents);
    expect(preview.unchanged).toHaveLength(1);
  });

  it('flags invalid rows with missing student_id', () => {
    const rows = parseCsv('student_id,name,roll_number\n,Unknown,5');
    const preview = previewRollNumberImport(rows, mockStudents);
    expect(preview.invalid).toHaveLength(1);
  });
});

describe('previewMarksImport', () => {
  it('detects mark changes', () => {
    const existing = new Map<string, number | null>([['uuid-1', 50]]);
    const rows = parseCsv('student_id,roll_number,name,marks\nuuid-1,1,Alice,75');
    const preview = previewMarksImport(rows, mockStudents, existing, 100, false);
    expect(preview.toUpdate).toHaveLength(1);
    expect(preview.toUpdate[0].marks).toBe(75);
  });

  it('detects unchanged marks', () => {
    const existing = new Map<string, number | null>([['uuid-1', 75]]);
    const rows = parseCsv('student_id,roll_number,name,marks\nuuid-1,1,Alice,75');
    const preview = previewMarksImport(rows, mockStudents, existing, 100, false);
    expect(preview.unchanged).toHaveLength(1);
  });

  it('rejects marks exceeding maximum', () => {
    const existing = new Map<string, number | null>();
    const rows = parseCsv('student_id,roll_number,name,marks\nuuid-1,1,Alice,150');
    const preview = previewMarksImport(rows, mockStudents, existing, 100, false);
    expect(preview.invalid).toHaveLength(1);
  });

  it('allows marks over maximum when allowed', () => {
    const existing = new Map<string, number | null>();
    const rows = parseCsv('student_id,roll_number,name,marks\nuuid-1,1,Alice,150');
    const preview = previewMarksImport(rows, mockStudents, existing, 100, true);
    expect(preview.toUpdate).toHaveLength(1);
  });

  it('rejects negative marks', () => {
    const existing = new Map<string, number | null>();
    const rows = parseCsv('student_id,roll_number,name,marks\nuuid-1,1,Alice,-5');
    const preview = previewMarksImport(rows, mockStudents, existing, 100, false);
    expect(preview.invalid).toHaveLength(1);
  });

  it('handles absent marks', () => {
    const existing = new Map<string, number | null>([['uuid-1', 50]]);
    const rows = parseCsv('student_id,roll_number,name,marks\nuuid-1,1,Alice,absent');
    const preview = previewMarksImport(rows, mockStudents, existing, 100, false);
    expect(preview.toUpdate).toHaveLength(1);
    expect(preview.toUpdate[0].marks).toBeNull();
  });
});

describe('studentsToCsv', () => {
  it('exports students with stable IDs', () => {
    const csv = studentsToCsv(mockStudents);
    expect(csv).toContain('student_id');
    expect(csv).toContain('uuid-1');
    expect(csv).toContain('Alice');
    expect(csv).toContain('ADM001');
  });
});

describe('class-aware student import', () => {
  const classes = [{ id: 'cls-1', name: 'Plus Two', division: 'A', academicYear: '2026-27', createdAt: '', updatedAt: '' }];
  it('plans a new class and student with no existing classes', () => {
    const rows = parseCsv('class_name,division,academic_year,roll_number,name\nPlus Two,A,2026-27,1,Alice');
    const plan = previewStudentCsvImport(rows, [], []);
    expect(plan.classes[0].status).toBe('create');
    expect(plan.students[0].status).toBe('create');
  });
  it('reuses a uniquely matching class and updates by stable student id', () => {
    const rows = parseCsv('student_id,class_id,class_name,division,academic_year,roll_number,name,admission_number\nuuid-1,cls-1,Plus Two,A,2026-27,5,Alice,ADM001');
    const plan = previewStudentCsvImport(rows, classes, mockStudents);
    expect(plan.classes[0].status).toBe('existing');
    expect(plan.students[0].status).toBe('update');
  });
  it('includes class headings in the blank template', () => {
    expect(blankStudentTemplate()).toContain('class_name');
    expect(blankStudentTemplate()).toContain('academic_year');
  });
  it('accepts the app template after a student row is completed', () => {
    const rows = parseCsv(`\uFEFF${blankStudentTemplate()}`);
    rows[0].roll_number = '1';
    rows[0].name = 'Test Student';
    const plan = previewStudentCsvImport(rows, [], []);
    expect(plan.invalid).toHaveLength(0);
    expect(plan.students).toEqual(expect.arrayContaining([expect.objectContaining({ rollNumber: '1', name: 'Test Student' })]));
  });
});
