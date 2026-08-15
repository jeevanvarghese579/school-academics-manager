import { v4 as uuidv4 } from 'uuid';
import { SamDexie } from './SamDexie';
import type { DataRepository } from './DataRepository';
import type {
  Assignment,
  AssignmentStatus,
  BackupData,
  ClassRoom,
  Exam,
  ExamMark,
  GraceMark,
  PlusOneMark,
  CombinedAnalysis,
  Student,
  UserSettings,
} from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

function now(): string {
  return new Date().toISOString();
}

export class IndexedDbRepository implements DataRepository {
  private db: SamDexie;

  constructor() {
    this.db = new SamDexie();
  }

  async getSettings(): Promise<UserSettings | null> {
    const all = await this.db.settings.toArray();
    return all[0] ? { ...DEFAULT_SETTINGS, ...all[0] } : null;
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    await this.db.settings.put(settings);
  }

  async getClasses(): Promise<ClassRoom[]> {
    return this.db.classes.orderBy('name').toArray();
  }

  async getClass(id: string): Promise<ClassRoom | null> {
    return (await this.db.classes.get(id)) ?? null;
  }

  async createClass(c: Omit<ClassRoom, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassRoom> {
    const entity: ClassRoom = { ...c, id: uuidv4(), createdAt: now(), updatedAt: now() };
    await this.db.classes.add(entity);
    return entity;
  }

  async updateClass(c: ClassRoom): Promise<void> {
    await this.db.classes.put({ ...c, updatedAt: now() });
  }

  async deleteClass(id: string): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.classes, this.db.students, this.db.exams, this.db.examMarks, this.db.plusOneMarks, this.db.assignments, this.db.assignmentStatuses, this.db.graceMarks, this.db.combinedAnalyses],
      async () => {
        const students = await this.db.students.where('classId').equals(id).toArray();
        const studentIds = students.map((s) => s.id);
        const exams = await this.db.exams.where('classId').equals(id).toArray();
        const examIds = exams.map((e) => e.id);
        const assignments = await this.db.assignments.where('classId').equals(id).toArray();
        const assignmentIds = assignments.map((a) => a.id);

        await this.db.graceMarks.where('classId').equals(id).delete();
        await this.db.assignmentStatuses.where('classId').equals(id).delete();
        await this.db.assignments.where('classId').equals(id).delete();
        for (const eid of examIds) {
          await this.db.examMarks.where('examId').equals(eid).delete();
          await this.db.plusOneMarks.where('examId').equals(eid).delete();
        }
        await this.db.exams.where('classId').equals(id).delete();
        await this.db.combinedAnalyses.where('classId').equals(id).delete();
        await this.db.students.where('classId').equals(id).delete();
        await this.db.classes.delete(id);
        void studentIds; void assignmentIds;
      },
    );
  }

  async getStudents(classId?: string): Promise<Student[]> {
    if (classId) {
      return this.db.students.where('classId').equals(classId).toArray();
    }
    return this.db.students.toArray();
  }

  async getStudent(id: string): Promise<Student | null> {
    return (await this.db.students.get(id)) ?? null;
  }

  async createStudent(s: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
    const entity: Student = { ...s, id: uuidv4(), createdAt: now(), updatedAt: now() };
    await this.db.students.add(entity);
    return entity;
  }

  async updateStudent(s: Student): Promise<void> {
    await this.db.students.put({ ...s, updatedAt: now() });
  }

  async deleteStudent(id: string): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.students, this.db.examMarks, this.db.plusOneMarks, this.db.assignmentStatuses, this.db.graceMarks],
      async () => {
        await this.db.examMarks.where('studentId').equals(id).delete();
        await this.db.plusOneMarks.where('studentId').equals(id).delete();
        await this.db.assignmentStatuses.where('studentId').equals(id).delete();
        await this.db.graceMarks.where('studentId').equals(id).delete();
        await this.db.students.delete(id);
      },
    );
  }

  async bulkCreateStudents(students: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Student[]> {
    const entities = students.map((s) => ({ ...s, id: uuidv4(), createdAt: now(), updatedAt: now() }));
    await this.db.students.bulkAdd(entities);
    return entities;
  }

  async getExams(classId?: string): Promise<Exam[]> {
    if (classId) {
      return this.db.exams.where('classId').equals(classId).toArray();
    }
    return this.db.exams.toArray();
  }

  async getExam(id: string): Promise<Exam | null> {
    return (await this.db.exams.get(id)) ?? null;
  }

  async createExam(e: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>): Promise<Exam> {
    const entity: Exam = { ...e, id: uuidv4(), createdAt: now(), updatedAt: now() };
    await this.db.exams.add(entity);
    return entity;
  }

  async updateExam(e: Exam): Promise<void> {
    await this.db.exams.put({ ...e, updatedAt: now() });
  }

  async deleteExam(id: string): Promise<void> {
    await this.db.transaction('rw', [this.db.exams, this.db.examMarks, this.db.plusOneMarks], async () => {
      await this.db.examMarks.where('examId').equals(id).delete();
      await this.db.plusOneMarks.where('examId').equals(id).delete();
      await this.db.exams.delete(id);
    });
  }

  async getExamMarks(examId: string): Promise<ExamMark[]> {
    return this.db.examMarks.where('examId').equals(examId).toArray();
  }

  async getAllMarksForClass(classId: string): Promise<ExamMark[]> {
    return this.db.examMarks.where('classId').equals(classId).toArray();
  }

  async saveExamMark(m: Omit<ExamMark, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExamMark> {
    const existing = await this.db.examMarks
      .where('examId')
      .equals(m.examId)
      .and((x) => x.studentId === m.studentId)
      .first();
    if (existing) {
      const updated = { ...existing, ...m, updatedAt: now() };
      await this.db.examMarks.put(updated);
      return updated;
    }
    const entity: ExamMark = { ...m, id: uuidv4(), createdAt: now(), updatedAt: now() };
    await this.db.examMarks.add(entity);
    return entity;
  }

  async bulkSaveExamMarks(marks: Omit<ExamMark, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    for (const m of marks) {
      await this.saveExamMark(m);
    }
  }

  async deleteExamMarks(examId: string): Promise<void> {
    await this.db.examMarks.where('examId').equals(examId).delete();
  }

  async getPlusOneMarks(examId: string): Promise<PlusOneMark[]> {
    return this.db.plusOneMarks.where('examId').equals(examId).toArray();
  }

  async getAllPlusOneMarksForClass(classId: string): Promise<PlusOneMark[]> {
    return this.db.plusOneMarks.where('classId').equals(classId).toArray();
  }

  async savePlusOneMark(m: Omit<PlusOneMark, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlusOneMark> {
    const existing = await this.db.plusOneMarks
      .where('examId')
      .equals(m.examId)
      .and((x) => x.studentId === m.studentId)
      .first();
    if (existing) {
      const updated = { ...existing, ...m, updatedAt: now() };
      await this.db.plusOneMarks.put(updated);
      return updated;
    }
    const entity: PlusOneMark = { ...m, id: uuidv4(), createdAt: now(), updatedAt: now() };
    await this.db.plusOneMarks.add(entity);
    return entity;
  }

  async bulkSavePlusOneMarks(marks: Omit<PlusOneMark, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    for (const m of marks) {
      await this.savePlusOneMark(m);
    }
  }

  async deletePlusOneMarks(examId: string): Promise<void> {
    await this.db.plusOneMarks.where('examId').equals(examId).delete();
  }

  async getAssignments(classId?: string): Promise<Assignment[]> {
    if (classId) {
      return this.db.assignments.where('classId').equals(classId).toArray();
    }
    return this.db.assignments.toArray();
  }

  async getAssignment(id: string): Promise<Assignment | null> {
    return (await this.db.assignments.get(id)) ?? null;
  }

  async createAssignment(a: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Assignment> {
    const entity: Assignment = { ...a, id: uuidv4(), createdAt: now(), updatedAt: now() };
    await this.db.assignments.add(entity);
    return entity;
  }

  async updateAssignment(a: Assignment): Promise<void> {
    await this.db.assignments.put({ ...a, updatedAt: now() });
  }

  async deleteAssignment(id: string): Promise<void> {
    await this.db.transaction('rw', [this.db.assignments, this.db.assignmentStatuses], async () => {
      await this.db.assignmentStatuses.where('assignmentId').equals(id).delete();
      await this.db.assignments.delete(id);
    });
  }

  async getAssignmentStatuses(assignmentId: string): Promise<AssignmentStatus[]> {
    return this.db.assignmentStatuses.where('assignmentId').equals(assignmentId).toArray();
  }

  async getAllAssignmentStatusesForClass(classId: string): Promise<AssignmentStatus[]> {
    return this.db.assignmentStatuses.where('classId').equals(classId).toArray();
  }

  async saveAssignmentStatus(s: Omit<AssignmentStatus, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssignmentStatus> {
    const existing = await this.db.assignmentStatuses
      .where('assignmentId')
      .equals(s.assignmentId)
      .and((x) => x.studentId === s.studentId)
      .first();
    if (existing) {
      const updated = { ...existing, ...s, updatedAt: now() };
      await this.db.assignmentStatuses.put(updated);
      return updated;
    }
    const entity: AssignmentStatus = { ...s, id: uuidv4(), createdAt: now(), updatedAt: now() };
    await this.db.assignmentStatuses.add(entity);
    return entity;
  }

  async bulkSaveAssignmentStatuses(statuses: Omit<AssignmentStatus, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    for (const s of statuses) {
      await this.saveAssignmentStatus(s);
    }
  }

  async getGraceMarks(classId?: string): Promise<GraceMark[]> {
    if (classId) {
      return this.db.graceMarks.where('classId').equals(classId).toArray();
    }
    return this.db.graceMarks.toArray();
  }

  async getGraceMarksForStudent(studentId: string): Promise<GraceMark[]> {
    return this.db.graceMarks.where('studentId').equals(studentId).toArray();
  }

  async createGraceMark(g: Omit<GraceMark, 'id' | 'createdAt' | 'updatedAt'>): Promise<GraceMark> {
    const entity: GraceMark = { ...g, id: uuidv4(), createdAt: now(), updatedAt: now() };
    await this.db.graceMarks.add(entity);
    return entity;
  }

  async updateGraceMark(g: GraceMark): Promise<void> {
    await this.db.graceMarks.put({ ...g, updatedAt: now() });
  }

  async deleteGraceMark(id: string): Promise<void> {
    await this.db.graceMarks.delete(id);
  }

  async getCombinedAnalyses(classId?: string): Promise<CombinedAnalysis[]> {
    return classId ? this.db.combinedAnalyses.where('classId').equals(classId).toArray() : this.db.combinedAnalyses.toArray();
  }

  async createCombinedAnalysis(analysis: Omit<CombinedAnalysis, 'id' | 'createdAt' | 'updatedAt'>): Promise<CombinedAnalysis> {
    if (analysis.examIds.length < 2) throw new Error('A combined analysis requires at least two exams');
    const entity: CombinedAnalysis = { ...analysis, id: uuidv4(), createdAt: now(), updatedAt: now() };
    await this.db.combinedAnalyses.add(entity);
    return entity;
  }

  async updateCombinedAnalysis(analysis: CombinedAnalysis): Promise<void> {
    if (analysis.examIds.length < 2) throw new Error('A combined analysis requires at least two exams');
    await this.db.combinedAnalyses.put({ ...analysis, updatedAt: now() });
  }

  async deleteCombinedAnalysis(id: string): Promise<void> { await this.db.combinedAnalyses.delete(id); }

  async exportBackup(): Promise<BackupData> {
    const [settings, classes, students, exams, examMarks, plusOneMarks, assignments, assignmentStatuses, graceMarks, combinedAnalyses] =
      await Promise.all([
        this.db.settings.toArray(),
        this.db.classes.toArray(),
        this.db.students.toArray(),
        this.db.exams.toArray(),
        this.db.examMarks.toArray(),
        this.db.plusOneMarks.toArray(),
        this.db.assignments.toArray(),
        this.db.assignmentStatuses.toArray(),
        this.db.graceMarks.toArray(),
        this.db.combinedAnalyses.toArray(),
      ]);
    return {
      version: '1.0.6',
      exportedAt: now(),
      settings: settings[0] ?? null,
      classes,
      students,
      exams,
      examMarks,
      plusOneMarks,
      assignments,
      assignmentStatuses,
      graceMarks,
      combinedAnalyses,
    };
  }

  async importBackup(data: BackupData, onProgress?: (completed: number, total: number) => void): Promise<void> {
    await this.db.transaction(
      'rw',
      [
        this.db.settings,
        this.db.classes,
        this.db.students,
        this.db.exams,
        this.db.examMarks,
        this.db.plusOneMarks,
        this.db.assignments,
        this.db.assignmentStatuses,
        this.db.graceMarks,
        this.db.combinedAnalyses,
      ],
      async () => {
        await this.db.settings.clear();
        await this.db.classes.clear();
        await this.db.students.clear();
        await this.db.exams.clear();
        await this.db.examMarks.clear();
        await this.db.plusOneMarks.clear();
        await this.db.assignments.clear();
        await this.db.assignmentStatuses.clear();
        await this.db.graceMarks.clear();
        await this.db.combinedAnalyses.clear();
        if (data.settings) await this.db.settings.put(data.settings);
        await this.db.classes.bulkPut(data.classes || []);
        await this.db.students.bulkPut(data.students || []);
        await this.db.exams.bulkPut(data.exams || []);
        await this.db.examMarks.bulkPut(data.examMarks || []);
        await this.db.plusOneMarks.bulkPut(data.plusOneMarks || []);
        await this.db.assignments.bulkPut(data.assignments || []);
        await this.db.assignmentStatuses.bulkPut(data.assignmentStatuses || []);
        await this.db.graceMarks.bulkPut(data.graceMarks || []);
        await this.db.combinedAnalyses.bulkPut(data.combinedAnalyses || []);
        onProgress?.(1, 1);
      },
    );
  }

  async clearAllData(): Promise<void> {
    await this.db.transaction(
      'rw',
      [
        this.db.settings,
        this.db.classes,
        this.db.students,
        this.db.exams,
        this.db.examMarks,
        this.db.plusOneMarks,
        this.db.assignments,
        this.db.assignmentStatuses,
        this.db.graceMarks,
        this.db.combinedAnalyses,
      ],
      async () => {
        await this.db.settings.clear();
        await this.db.classes.clear();
        await this.db.students.clear();
        await this.db.exams.clear();
        await this.db.examMarks.clear();
        await this.db.plusOneMarks.clear();
        await this.db.assignments.clear();
        await this.db.assignmentStatuses.clear();
        await this.db.graceMarks.clear();
        await this.db.combinedAnalyses.clear();
      },
    );
  }
}
