import type {
  Assignment,
  AssignmentStatus,
  BackupData,
  ClassRoom,
  Exam,
  ExamMark,
  GraceMark,
  PlusOneMark,
  Student,
  UserSettings,
} from '@/types';

export interface DataRepository {
  // Settings
  getSettings(): Promise<UserSettings | null>;
  saveSettings(settings: UserSettings): Promise<void>;

  // Classes
  getClasses(): Promise<ClassRoom[]>;
  getClass(id: string): Promise<ClassRoom | null>;
  createClass(c: Omit<ClassRoom, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassRoom>;
  updateClass(c: ClassRoom): Promise<void>;
  deleteClass(id: string): Promise<void>;

  // Students
  getStudents(classId?: string): Promise<Student[]>;
  getStudent(id: string): Promise<Student | null>;
  createStudent(s: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student>;
  updateStudent(s: Student): Promise<void>;
  deleteStudent(id: string): Promise<void>;
  bulkCreateStudents(students: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Student[]>;

  // Exams
  getExams(classId?: string): Promise<Exam[]>;
  getExam(id: string): Promise<Exam | null>;
  createExam(e: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>): Promise<Exam>;
  updateExam(e: Exam): Promise<void>;
  deleteExam(id: string): Promise<void>;

  // Exam Marks
  getExamMarks(examId: string): Promise<ExamMark[]>;
  getAllMarksForClass(classId: string): Promise<ExamMark[]>;
  saveExamMark(m: Omit<ExamMark, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExamMark>;
  bulkSaveExamMarks(marks: Omit<ExamMark, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void>;
  deleteExamMarks(examId: string): Promise<void>;

  // Plus One Marks
  getPlusOneMarks(examId: string): Promise<PlusOneMark[]>;
  getAllPlusOneMarksForClass(classId: string): Promise<PlusOneMark[]>;
  savePlusOneMark(m: Omit<PlusOneMark, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlusOneMark>;
  bulkSavePlusOneMarks(marks: Omit<PlusOneMark, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void>;
  deletePlusOneMarks(examId: string): Promise<void>;

  // Assignments
  getAssignments(classId?: string): Promise<Assignment[]>;
  getAssignment(id: string): Promise<Assignment | null>;
  createAssignment(a: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Assignment>;
  updateAssignment(a: Assignment): Promise<void>;
  deleteAssignment(id: string): Promise<void>;

  // Assignment Statuses
  getAssignmentStatuses(assignmentId: string): Promise<AssignmentStatus[]>;
  getAllAssignmentStatusesForClass(classId: string): Promise<AssignmentStatus[]>;
  saveAssignmentStatus(s: Omit<AssignmentStatus, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssignmentStatus>;
  bulkSaveAssignmentStatuses(statuses: Omit<AssignmentStatus, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void>;

  // Grace Marks
  getGraceMarks(classId?: string): Promise<GraceMark[]>;
  getGraceMarksForStudent(studentId: string): Promise<GraceMark[]>;
  createGraceMark(g: Omit<GraceMark, 'id' | 'createdAt' | 'updatedAt'>): Promise<GraceMark>;
  updateGraceMark(g: GraceMark): Promise<void>;
  deleteGraceMark(id: string): Promise<void>;

  // Backup
  exportBackup(): Promise<BackupData>;
  importBackup(data: BackupData): Promise<void>;
  clearAllData(): Promise<void>;
}
