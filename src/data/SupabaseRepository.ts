import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
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

function mapClass(row: any): ClassRoom {
  return {
    id: row.id,
    name: row.name,
    division: row.division ?? '',
    academicYear: row.academic_year ?? '',
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStudent(row: any): Student {
  return {
    id: row.id,
    classId: row.class_id,
    rollNumber: row.roll_number ?? '',
    name: row.name,
    admissionNumber: row.admission_number ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapExam(row: any): Exam {
  return {
    id: row.id,
    name: row.name,
    classId: row.class_id,
    subject: row.subject ?? undefined,
    date: row.date ?? '',
    maxMarks: Number(row.max_marks ?? 100),
    notes: row.notes ?? undefined,
    type: row.type ?? 'regular',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapExamMark(row: any): ExamMark {
  return {
    id: row.id,
    examId: row.exam_id,
    studentId: row.student_id,
    classId: row.class_id,
    marks: row.marks === null || row.marks === undefined ? null : Number(row.marks),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlusOneMark(row: any): PlusOneMark {
  return {
    id: row.id,
    examId: row.exam_id,
    studentId: row.student_id,
    classId: row.class_id,
    teMarks: row.te_marks === null || row.te_marks === undefined ? null : Number(row.te_marks),
    ceMarks: row.ce_marks === null || row.ce_marks === undefined ? null : Number(row.ce_marks),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAssignment(row: any): Assignment {
  return {
    id: row.id,
    title: row.title,
    classId: row.class_id,
    subject: row.subject ?? undefined,
    dueDate: row.due_date ?? '',
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAssignmentStatus(row: any): AssignmentStatus {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    classId: row.class_id,
    submitted: row.submitted ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGraceMark(row: any): GraceMark {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    category: row.category ?? 'Other',
    date: row.date ?? '',
    studentId: row.student_id,
    classId: row.class_id,
    marks: Number(row.marks ?? 0),
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCombinedAnalysis(row: any): CombinedAnalysis {
  return { id: row.id, classId: row.class_id, name: row.name, examIds: row.exam_ids ?? [], createdAt: row.created_at, updatedAt: row.updated_at };
}

export class SupabaseRepository implements DataRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // Settings
  async getSettings(): Promise<UserSettings | null> {
    const { data, error } = await this.client.from('sam_settings').select('*').maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const stored = data.data as Partial<UserSettings>;
    return {
      id: data.id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      ...DEFAULT_SETTINGS,
      ...stored,
    } as UserSettings;
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    const { id, createdAt, updatedAt, ...rest } = settings;
    const { data: existing } = await this.client.from('sam_settings').select('id').maybeSingle();
    if (existing) {
      const { error } = await this.client
        .from('sam_settings')
        .update({ data: rest, updated_at: now() })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await this.client.from('sam_settings').insert({ data: rest });
      if (error) throw error;
    }
  }

  // Classes
  async getClasses(): Promise<ClassRoom[]> {
    const { data, error } = await this.client.from('sam_classes').select('*').order('name');
    if (error) throw error;
    return (data || []).map(mapClass);
  }

  async getClass(id: string): Promise<ClassRoom | null> {
    const { data, error } = await this.client.from('sam_classes').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapClass(data) : null;
  }

  async createClass(c: Omit<ClassRoom, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassRoom> {
    const { data, error } = await this.client
      .from('sam_classes')
      .insert({
        name: c.name,
        division: c.division,
        academic_year: c.academicYear,
        description: c.description ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapClass(data);
  }

  async updateClass(c: ClassRoom): Promise<void> {
    const { error } = await this.client
      .from('sam_classes')
      .update({
        name: c.name,
        division: c.division,
        academic_year: c.academicYear,
        description: c.description ?? null,
        updated_at: now(),
      })
      .eq('id', c.id);
    if (error) throw error;
  }

  async deleteClass(id: string): Promise<void> {
    const { error } = await this.client.from('sam_classes').delete().eq('id', id);
    if (error) throw error;
  }

  // Students
  async getStudents(classId?: string): Promise<Student[]> {
    let q = this.client.from('sam_students').select('*');
    if (classId) q = q.eq('class_id', classId);
    const { data, error } = await q.order('roll_number');
    if (error) throw error;
    return (data || []).map(mapStudent);
  }

  async getStudent(id: string): Promise<Student | null> {
    const { data, error } = await this.client.from('sam_students').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapStudent(data) : null;
  }

  async createStudent(s: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
    const { data, error } = await this.client
      .from('sam_students')
      .insert({
        class_id: s.classId,
        roll_number: s.rollNumber,
        name: s.name,
        admission_number: s.admissionNumber ?? null,
        notes: s.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapStudent(data);
  }

  async updateStudent(s: Student): Promise<void> {
    const { error } = await this.client
      .from('sam_students')
      .update({
        class_id: s.classId,
        roll_number: s.rollNumber,
        name: s.name,
        admission_number: s.admissionNumber ?? null,
        notes: s.notes ?? null,
        updated_at: now(),
      })
      .eq('id', s.id);
    if (error) throw error;
  }

  async deleteStudent(id: string): Promise<void> {
    const { error } = await this.client.from('sam_students').delete().eq('id', id);
    if (error) throw error;
  }

  async bulkCreateStudents(students: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Student[]> {
    const rows = students.map((s) => ({
      class_id: s.classId,
      roll_number: s.rollNumber,
      name: s.name,
      admission_number: s.admissionNumber ?? null,
      notes: s.notes ?? null,
    }));
    const { data, error } = await this.client.from('sam_students').insert(rows).select();
    if (error) throw error;
    return (data || []).map(mapStudent);
  }

  // Exams
  async getExams(classId?: string): Promise<Exam[]> {
    let q = this.client.from('sam_exams').select('*');
    if (classId) q = q.eq('class_id', classId);
    const { data, error } = await q.order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapExam);
  }

  async getExam(id: string): Promise<Exam | null> {
    const { data, error } = await this.client.from('sam_exams').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapExam(data) : null;
  }

  async createExam(e: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>): Promise<Exam> {
    const { data, error } = await this.client
      .from('sam_exams')
      .insert({
        name: e.name,
        class_id: e.classId,
        subject: e.subject ?? null,
        date: e.date || null,
        max_marks: e.maxMarks,
        notes: e.notes ?? null,
        type: e.type,
      })
      .select()
      .single();
    if (error) throw error;
    return mapExam(data);
  }

  async updateExam(e: Exam): Promise<void> {
    const { error } = await this.client
      .from('sam_exams')
      .update({
        name: e.name,
        class_id: e.classId,
        subject: e.subject ?? null,
        date: e.date || null,
        max_marks: e.maxMarks,
        notes: e.notes ?? null,
        type: e.type,
        updated_at: now(),
      })
      .eq('id', e.id);
    if (error) throw error;
  }

  async deleteExam(id: string): Promise<void> {
    const { error } = await this.client.from('sam_exams').delete().eq('id', id);
    if (error) throw error;
  }

  // Exam Marks
  async getExamMarks(examId: string): Promise<ExamMark[]> {
    const { data, error } = await this.client.from('sam_exam_marks').select('*').eq('exam_id', examId);
    if (error) throw error;
    return (data || []).map(mapExamMark);
  }

  async getAllMarksForClass(classId: string): Promise<ExamMark[]> {
    const { data, error } = await this.client.from('sam_exam_marks').select('*').eq('class_id', classId);
    if (error) throw error;
    return (data || []).map(mapExamMark);
  }

  async saveExamMark(m: Omit<ExamMark, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExamMark> {
    const { data: existing } = await this.client
      .from('sam_exam_marks')
      .select('*')
      .eq('exam_id', m.examId)
      .eq('student_id', m.studentId)
      .maybeSingle();
    if (existing) {
      const { data, error } = await this.client
        .from('sam_exam_marks')
        .update({ marks: m.marks, updated_at: now() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return mapExamMark(data);
    }
    const { data, error } = await this.client
      .from('sam_exam_marks')
      .insert({
        exam_id: m.examId,
        student_id: m.studentId,
        class_id: m.classId,
        marks: m.marks,
      })
      .select()
      .single();
    if (error) throw error;
    return mapExamMark(data);
  }

  async bulkSaveExamMarks(marks: Omit<ExamMark, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    for (const m of marks) {
      await this.saveExamMark(m);
    }
  }

  async deleteExamMarks(examId: string): Promise<void> {
    const { error } = await this.client.from('sam_exam_marks').delete().eq('exam_id', examId);
    if (error) throw error;
  }

  // Plus One Marks
  async getPlusOneMarks(examId: string): Promise<PlusOneMark[]> {
    const { data, error } = await this.client.from('sam_plus_one_marks').select('*').eq('exam_id', examId);
    if (error) throw error;
    return (data || []).map(mapPlusOneMark);
  }

  async getAllPlusOneMarksForClass(classId: string): Promise<PlusOneMark[]> {
    const { data, error } = await this.client.from('sam_plus_one_marks').select('*').eq('class_id', classId);
    if (error) throw error;
    return (data || []).map(mapPlusOneMark);
  }

  async savePlusOneMark(m: Omit<PlusOneMark, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlusOneMark> {
    const { data: existing } = await this.client
      .from('sam_plus_one_marks')
      .select('*')
      .eq('exam_id', m.examId)
      .eq('student_id', m.studentId)
      .maybeSingle();
    if (existing) {
      const { data, error } = await this.client
        .from('sam_plus_one_marks')
        .update({ te_marks: m.teMarks, ce_marks: m.ceMarks, updated_at: now() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return mapPlusOneMark(data);
    }
    const { data, error } = await this.client
      .from('sam_plus_one_marks')
      .insert({
        exam_id: m.examId,
        student_id: m.studentId,
        class_id: m.classId,
        te_marks: m.teMarks,
        ce_marks: m.ceMarks,
      })
      .select()
      .single();
    if (error) throw error;
    return mapPlusOneMark(data);
  }

  async bulkSavePlusOneMarks(marks: Omit<PlusOneMark, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    for (const m of marks) {
      await this.savePlusOneMark(m);
    }
  }

  async deletePlusOneMarks(examId: string): Promise<void> {
    const { error } = await this.client.from('sam_plus_one_marks').delete().eq('exam_id', examId);
    if (error) throw error;
  }

  // Assignments
  async getAssignments(classId?: string): Promise<Assignment[]> {
    let q = this.client.from('sam_assignments').select('*');
    if (classId) q = q.eq('class_id', classId);
    const { data, error } = await q.order('due_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapAssignment);
  }

  async getAssignment(id: string): Promise<Assignment | null> {
    const { data, error } = await this.client.from('sam_assignments').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapAssignment(data) : null;
  }

  async createAssignment(a: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Assignment> {
    const { data, error } = await this.client
      .from('sam_assignments')
      .insert({
        title: a.title,
        class_id: a.classId,
        subject: a.subject ?? null,
        due_date: a.dueDate || null,
        description: a.description ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapAssignment(data);
  }

  async updateAssignment(a: Assignment): Promise<void> {
    const { error } = await this.client
      .from('sam_assignments')
      .update({
        title: a.title,
        class_id: a.classId,
        subject: a.subject ?? null,
        due_date: a.dueDate || null,
        description: a.description ?? null,
        updated_at: now(),
      })
      .eq('id', a.id);
    if (error) throw error;
  }

  async deleteAssignment(id: string): Promise<void> {
    const { error } = await this.client.from('sam_assignments').delete().eq('id', id);
    if (error) throw error;
  }

  // Assignment Statuses
  async getAssignmentStatuses(assignmentId: string): Promise<AssignmentStatus[]> {
    const { data, error } = await this.client
      .from('sam_assignment_statuses')
      .select('*')
      .eq('assignment_id', assignmentId);
    if (error) throw error;
    return (data || []).map(mapAssignmentStatus);
  }

  async getAllAssignmentStatusesForClass(classId: string): Promise<AssignmentStatus[]> {
    const { data, error } = await this.client
      .from('sam_assignment_statuses')
      .select('*')
      .eq('class_id', classId);
    if (error) throw error;
    return (data || []).map(mapAssignmentStatus);
  }

  async saveAssignmentStatus(s: Omit<AssignmentStatus, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssignmentStatus> {
    const { data: existing } = await this.client
      .from('sam_assignment_statuses')
      .select('*')
      .eq('assignment_id', s.assignmentId)
      .eq('student_id', s.studentId)
      .maybeSingle();
    if (existing) {
      const { data, error } = await this.client
        .from('sam_assignment_statuses')
        .update({ submitted: s.submitted, updated_at: now() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return mapAssignmentStatus(data);
    }
    const { data, error } = await this.client
      .from('sam_assignment_statuses')
      .insert({
        assignment_id: s.assignmentId,
        student_id: s.studentId,
        class_id: s.classId,
        submitted: s.submitted,
      })
      .select()
      .single();
    if (error) throw error;
    return mapAssignmentStatus(data);
  }

  async bulkSaveAssignmentStatuses(statuses: Omit<AssignmentStatus, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    for (const s of statuses) {
      await this.saveAssignmentStatus(s);
    }
  }

  // Grace Marks
  async getGraceMarks(classId?: string): Promise<GraceMark[]> {
    let q = this.client.from('sam_grace_marks').select('*');
    if (classId) q = q.eq('class_id', classId);
    const { data, error } = await q.order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapGraceMark);
  }

  async getGraceMarksForStudent(studentId: string): Promise<GraceMark[]> {
    const { data, error } = await this.client.from('sam_grace_marks').select('*').eq('student_id', studentId);
    if (error) throw error;
    return (data || []).map(mapGraceMark);
  }

  async createGraceMark(g: Omit<GraceMark, 'id' | 'createdAt' | 'updatedAt'>): Promise<GraceMark> {
    const { data, error } = await this.client
      .from('sam_grace_marks')
      .insert({
        title: g.title,
        description: g.description ?? null,
        category: g.category,
        date: g.date || null,
        student_id: g.studentId,
        class_id: g.classId,
        marks: g.marks,
        notes: g.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapGraceMark(data);
  }

  async updateGraceMark(g: GraceMark): Promise<void> {
    const { error } = await this.client
      .from('sam_grace_marks')
      .update({
        title: g.title,
        description: g.description ?? null,
        category: g.category,
        date: g.date || null,
        student_id: g.studentId,
        class_id: g.classId,
        marks: g.marks,
        notes: g.notes ?? null,
        updated_at: now(),
      })
      .eq('id', g.id);
    if (error) throw error;
  }

  async deleteGraceMark(id: string): Promise<void> {
    const { error } = await this.client.from('sam_grace_marks').delete().eq('id', id);
    if (error) throw error;
  }

  async getCombinedAnalyses(classId?: string): Promise<CombinedAnalysis[]> {
    let query = this.client.from('sam_combined_analyses').select('*');
    if (classId) query = query.eq('class_id', classId);
    const { data, error } = await query.order('created_at');
    if (error) throw error;
    return (data || []).map(mapCombinedAnalysis);
  }

  async createCombinedAnalysis(analysis: Omit<CombinedAnalysis, 'id' | 'createdAt' | 'updatedAt'>): Promise<CombinedAnalysis> {
    if (analysis.examIds.length < 2) throw new Error('A combined analysis requires at least two exams');
    const { data, error } = await this.client.from('sam_combined_analyses').insert({ class_id: analysis.classId, name: analysis.name, exam_ids: analysis.examIds }).select().single();
    if (error) throw error;
    return mapCombinedAnalysis(data);
  }

  async updateCombinedAnalysis(analysis: CombinedAnalysis): Promise<void> {
    if (analysis.examIds.length < 2) throw new Error('A combined analysis requires at least two exams');
    const { error } = await this.client.from('sam_combined_analyses').update({ name: analysis.name, exam_ids: analysis.examIds, updated_at: now() }).eq('id', analysis.id);
    if (error) throw error;
  }

  async deleteCombinedAnalysis(id: string): Promise<void> {
    const { error } = await this.client.from('sam_combined_analyses').delete().eq('id', id);
    if (error) throw error;
  }

  // Backup
  async exportBackup(): Promise<BackupData> {
    const [settings, classes, students, exams, examMarks, plusOneMarks, assignments, assignmentStatuses, graceMarks] =
      await Promise.all([
        this.getSettings(),
        this.getClasses(),
        this.getStudents(),
        this.getExams(),
        this.client.from('sam_exam_marks').select('*').then((r) => r.data || []),
        this.client.from('sam_plus_one_marks').select('*').then((r) => r.data || []),
        this.getAssignments(),
        this.client.from('sam_assignment_statuses').select('*').then((r) => r.data || []),
        this.getGraceMarks(),
      ]);
    return {
      version: '1.0.2',
      exportedAt: now(),
      settings,
      classes,
      students,
      exams,
      examMarks: examMarks.map(mapExamMark),
      plusOneMarks: plusOneMarks.map(mapPlusOneMark),
      assignments,
      assignmentStatuses: assignmentStatuses.map(mapAssignmentStatus),
      graceMarks,
    };
  }

  async importBackup(data: BackupData): Promise<void> {
    if (data.settings) await this.saveSettings(data.settings);
    for (const c of data.classes || []) {
      await this.client.from('sam_classes').upsert({
        id: c.id,
        name: c.name,
        division: c.division,
        academic_year: c.academicYear,
        description: c.description ?? null,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      });
    }
    for (const s of data.students || []) {
      await this.client.from('sam_students').upsert({
        id: s.id,
        class_id: s.classId,
        roll_number: s.rollNumber,
        name: s.name,
        admission_number: s.admissionNumber ?? null,
        notes: s.notes ?? null,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
      });
    }
    for (const e of data.exams || []) {
      await this.client.from('sam_exams').upsert({
        id: e.id,
        name: e.name,
        class_id: e.classId,
        subject: e.subject ?? null,
        date: e.date || null,
        max_marks: e.maxMarks,
        notes: e.notes ?? null,
        type: e.type,
        created_at: e.createdAt,
        updated_at: e.updatedAt,
      });
    }
    for (const m of data.examMarks || []) {
      await this.client.from('sam_exam_marks').upsert({
        id: m.id,
        exam_id: m.examId,
        student_id: m.studentId,
        class_id: m.classId,
        marks: m.marks,
        created_at: m.createdAt,
        updated_at: m.updatedAt,
      });
    }
    for (const m of data.plusOneMarks || []) {
      await this.client.from('sam_plus_one_marks').upsert({
        id: m.id,
        exam_id: m.examId,
        student_id: m.studentId,
        class_id: m.classId,
        te_marks: m.teMarks,
        ce_marks: m.ceMarks,
        created_at: m.createdAt,
        updated_at: m.updatedAt,
      });
    }
    for (const a of data.assignments || []) {
      await this.client.from('sam_assignments').upsert({
        id: a.id,
        title: a.title,
        class_id: a.classId,
        subject: a.subject ?? null,
        due_date: a.dueDate || null,
        description: a.description ?? null,
        created_at: a.createdAt,
        updated_at: a.updatedAt,
      });
    }
    for (const s of data.assignmentStatuses || []) {
      await this.client.from('sam_assignment_statuses').upsert({
        id: s.id,
        assignment_id: s.assignmentId,
        student_id: s.studentId,
        class_id: s.classId,
        submitted: s.submitted,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
      });
    }
    for (const g of data.graceMarks || []) {
      await this.client.from('sam_grace_marks').upsert({
        id: g.id,
        title: g.title,
        description: g.description ?? null,
        category: g.category,
        date: g.date || null,
        student_id: g.studentId,
        class_id: g.classId,
        marks: g.marks,
        notes: g.notes ?? null,
        created_at: g.createdAt,
        updated_at: g.updatedAt,
      });
    }
  }

  async clearAllData(): Promise<void> {
    await this.client.from('sam_grace_marks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await this.client.from('sam_assignment_statuses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await this.client.from('sam_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await this.client.from('sam_plus_one_marks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await this.client.from('sam_exam_marks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await this.client.from('sam_exams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await this.client.from('sam_students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await this.client.from('sam_classes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await this.client.from('sam_settings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
}
