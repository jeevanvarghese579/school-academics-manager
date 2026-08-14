import Dexie, { type Table } from 'dexie';
import type {
  Assignment,
  AssignmentStatus,
  ClassRoom,
  Exam,
  ExamMark,
  GraceMark,
  PlusOneMark,
  Student,
  UserSettings,
} from '@/types';

export class SamDexie extends Dexie {
  settings!: Table<UserSettings, string>;
  classes!: Table<ClassRoom, string>;
  students!: Table<Student, string>;
  exams!: Table<Exam, string>;
  examMarks!: Table<ExamMark, string>;
  plusOneMarks!: Table<PlusOneMark, string>;
  assignments!: Table<Assignment, string>;
  assignmentStatuses!: Table<AssignmentStatus, string>;
  graceMarks!: Table<GraceMark, string>;

  constructor() {
    super('sam_offline_db');
    this.version(1).stores({
      settings: 'id',
      classes: 'id, name, academicYear',
      students: 'id, classId, rollNumber, name',
      exams: 'id, classId, name, date, type',
      examMarks: 'id, examId, studentId, classId',
      plusOneMarks: 'id, examId, studentId, classId',
      assignments: 'id, classId, title, dueDate',
      assignmentStatuses: 'id, assignmentId, studentId, classId',
      graceMarks: 'id, studentId, classId, category, date',
    });
  }
}
