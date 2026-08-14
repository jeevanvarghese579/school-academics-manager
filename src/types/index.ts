export type ID = string;

export type StorageMode = 'offline' | 'online';

export interface BaseEntity {
  id: ID;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings extends BaseEntity {
  defaultAcademicYear: string;
  decimalPlaces: number;
  rankingEnabled: boolean;
  theme: 'system' | 'light' | 'dark';
  defaultClassId: string | null;
  // Plus One exam config
  plusOneMaxTE: number;
  plusOneMaxCE: number;
  plusOneMaxTotal: number;
  requiredTEPercent: number;
  requiredTotalPercent: number;
  /** Percentage required for the configured Plus One double-pass result. */
  doublePassRequiredPercent: number;
  doublePassEnabled: boolean;
  aPlusThreshold: number;
  allowMarksOverMax: boolean;
}

export interface ClassRoom extends BaseEntity {
  name: string;
  division: string;
  academicYear: string;
  description?: string;
}

export interface Student extends BaseEntity {
  classId: ID;
  rollNumber: string;
  name: string;
  admissionNumber?: string;
  notes?: string;
}

export type ExamType = 'regular' | 'plusOne';

export interface Exam extends BaseEntity {
  name: string;
  classId: ID;
  subject?: string;
  date: string;
  maxMarks: number;
  notes?: string;
  type: ExamType;
}

export interface ExamMark extends BaseEntity {
  examId: ID;
  studentId: ID;
  classId: ID;
  marks: number | null; // null = absent/blank
}

export interface PlusOneMark extends BaseEntity {
  examId: ID;
  studentId: ID;
  classId: ID;
  teMarks: number | null;
  ceMarks: number | null;
}

export interface Assignment extends BaseEntity {
  title: string;
  classId: ID;
  subject?: string;
  dueDate: string;
  description?: string;
}

export interface AssignmentStatus extends BaseEntity {
  assignmentId: ID;
  studentId: ID;
  classId: ID;
  submitted: boolean;
}

export type GraceCategory = 'Sports' | 'Arts' | 'NCC' | 'NSS' | 'Other';

export interface GraceMark extends BaseEntity {
  title: string;
  description?: string;
  category: GraceCategory | string;
  date: string;
  studentId: ID;
  classId: ID;
  marks: number;
  notes?: string;
}

export interface CombinedAnalysis extends BaseEntity {
  classId: ID;
  name: string;
  examIds: ID[];
}

export interface BackupData {
  version: string;
  exportedAt: string;
  settings: UserSettings | null;
  classes: ClassRoom[];
  students: Student[];
  exams: Exam[];
  examMarks: ExamMark[];
  plusOneMarks: PlusOneMark[];
  assignments: Assignment[];
  assignmentStatuses: AssignmentStatus[];
  graceMarks: GraceMark[];
  combinedAnalyses?: CombinedAnalysis[];
}

export const DEFAULT_SETTINGS: Omit<UserSettings, 'id' | 'createdAt' | 'updatedAt'> = {
  defaultAcademicYear: '',
  decimalPlaces: 2,
  rankingEnabled: false,
  theme: 'system',
  defaultClassId: null,
  plusOneMaxTE: 80,
  plusOneMaxCE: 20,
  plusOneMaxTotal: 100,
  requiredTEPercent: 30,
  requiredTotalPercent: 30,
  doublePassRequiredPercent: 30,
  doublePassEnabled: true,
  aPlusThreshold: 90,
  allowMarksOverMax: false,
};
