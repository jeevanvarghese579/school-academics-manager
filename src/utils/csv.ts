import Papa from 'papaparse';
import type { ClassRoom, Student } from '@/types';

export interface CsvRow {
  [key: string]: string;
}

export function parseCsv(text: string): CsvRow[] {
  const result = Papa.parse<CsvRow>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().toLowerCase(),
  });
  return result.data.filter((row) => Object.values(row).some((value) => String(value ?? '').trim() !== ''));
}

export function toCsv(rows: Record<string, string | number | null | undefined>[]): string {
  return Papa.unparse(rows, { quotes: true });
}

export function downloadFile(content: string, filename: string, mime = 'text/csv') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface StudentImportRow {
  student_id: string;
  roll_number: string;
  name: string;
  admission_number: string;
}

export interface StudentImportPreview {
  toCreate: { roll_number: string; name: string; admission_number: string }[];
  toUpdate: { student_id: string; roll_number: string; name: string; admission_number: string }[];
  unchanged: { student_id: string; roll_number: string; name: string; admission_number: string }[];
  invalid: { row: CsvRow; reason: string }[];
  duplicates: { row: CsvRow; reason: string }[];
}

export function previewStudentImport(
  rows: CsvRow[],
  existingStudents: Student[],
): StudentImportPreview {
  const existingById = new Map(existingStudents.map((s) => [s.id, s]));
  const seenIds = new Set<string>();
  const seenRolls = new Set<string>();

  const toCreate: StudentImportPreview['toCreate'] = [];
  const toUpdate: StudentImportPreview['toUpdate'] = [];
  const unchanged: StudentImportPreview['unchanged'] = [];
  const invalid: StudentImportPreview['invalid'] = [];
  const duplicates: StudentImportPreview['duplicates'] = [];

  for (const row of rows) {
    const studentId = (row.student_id || '').trim();
    const rollNumber = (row.roll_number || '').trim();
    const name = (row.name || '').trim();
    const admissionNumber = (row.admission_number || '').trim();

    if (!name) {
      invalid.push({ row, reason: 'Name is required' });
      continue;
    }
    if (!rollNumber) {
      invalid.push({ row, reason: 'Roll number is required' });
      continue;
    }

    if (studentId) {
      if (seenIds.has(studentId)) {
        duplicates.push({ row, reason: `Duplicate student_id: ${studentId}` });
        continue;
      }
      seenIds.add(studentId);
      const existing = existingById.get(studentId);
      if (existing) {
        if (
          existing.rollNumber === rollNumber &&
          existing.name === name &&
          (existing.admissionNumber ?? '') === admissionNumber
        ) {
          unchanged.push({ student_id: studentId, roll_number: rollNumber, name, admission_number: admissionNumber });
        } else {
          toUpdate.push({ student_id: studentId, roll_number: rollNumber, name, admission_number: admissionNumber });
        }
      } else {
        // ID provided but not found — treat as create with that ID
        toCreate.push({ roll_number: rollNumber, name, admission_number: admissionNumber });
      }
    } else {
      // No ID — new student
      const dedupeKey = `${rollNumber}`;
      if (seenRolls.has(dedupeKey)) {
        duplicates.push({ row, reason: `Duplicate roll number in file: ${rollNumber}` });
        continue;
      }
      seenRolls.add(dedupeKey);
      toCreate.push({ roll_number: rollNumber, name, admission_number: admissionNumber });
    }
  }

  return { toCreate, toUpdate, unchanged, invalid, duplicates };
}

export function studentsToCsv(students: Student[]): string {
  const rows = students.map((s) => ({
    student_id: s.id,
    roll_number: s.rollNumber,
    name: s.name,
    admission_number: s.admissionNumber ?? '',
  }));
  return toCsv(rows);
}

export function selectedStudentsToCsv(students: Student[]): string {
  return studentsToCsv(students);
}

export function blankStudentTemplate(): string {
  return toCsv([
    { student_id: '', class_id: '', class_name: '', division: '', academic_year: '', roll_number: '', name: '', admission_number: '' },
    { student_id: '', class_id: '', class_name: 'Plus Two', division: 'A', academic_year: '2026-27', roll_number: '1', name: 'Student Name', admission_number: '' },
  ]);
}

export interface ClassImportPlan { key: string; classId?: string; name: string; division: string; academicYear: string; status: 'existing' | 'create' | 'ambiguous'; }
export interface StudentImportPlan { studentId?: string; classKey: string; rollNumber: string; name: string; admissionNumber: string; status: 'create' | 'update' | 'unchanged'; existing?: Student; }
export interface StudentCsvImportPreview { classes: ClassImportPlan[]; students: StudentImportPlan[]; invalid: { row: CsvRow; reason: string }[]; duplicates: { row: CsvRow; reason: string }[]; }
export interface NormalizedStudentCsvRow { studentId?: string; classId?: string; className?: string; division?: string; academicYear?: string; rollNumber: string; name: string; admissionNumber?: string; }

function value(row: CsvRow, key: string): string { return String(row[key] ?? '').trim(); }
export function normalizeStudentCsvRow(row: CsvRow): NormalizedStudentCsvRow {
  const studentId = value(row, 'student_id'); const classId = value(row, 'class_id'); const className = value(row, 'class_name'); const division = value(row, 'division'); const academicYear = value(row, 'academic_year'); const admissionNumber = value(row, 'admission_number');
  return { studentId: studentId || undefined, classId: classId || undefined, className: className || undefined, division: division || undefined, academicYear: academicYear || undefined, rollNumber: value(row, 'roll_number'), name: value(row, 'name'), admissionNumber: admissionNumber || undefined };
}

/** Shared, storage-agnostic student/class CSV validation and import plan. */
export function previewStudentCsvImport(rows: CsvRow[], existingClasses: ClassRoom[], existingStudents: Student[]): StudentCsvImportPreview {
  const classes = new Map<string, ClassImportPlan>(); const students: StudentImportPlan[] = []; const invalid: StudentCsvImportPreview['invalid']=[]; const duplicates: StudentCsvImportPreview['duplicates']=[]; const seen = new Set<string>(); const byStudentId = new Map(existingStudents.map(s=>[s.id,s]));
  for (const row of rows) { const normalized=normalizeStudentCsvRow(row); const {studentId,classId,name,rollNumber,admissionNumber='',className='',division='',academicYear=''}=normalized;
    if(!name||!rollNumber){invalid.push({row,reason:'Student name and roll number are required'});continue;}
    let matches=classId?existingClasses.filter(c=>c.id===classId):existingClasses.filter(c=>c.name===className&&c.division===division&&c.academicYear===academicYear);
    if(!classId&&!className){invalid.push({row,reason:'class_id or class_name is required when importing without a selected class'});continue;}
    const key=classId||`${className}|${division}|${academicYear}`; let plan=classes.get(key);
    if(!plan){plan={key,classId:matches.length===1?matches[0].id:undefined,name:className||matches[0]?.name||'',division:division||matches[0]?.division||'',academicYear:academicYear||matches[0]?.academicYear||'',status:matches.length===1?'existing':matches.length>1?'ambiguous':'create'};classes.set(key,plan);}
    if(plan.status==='ambiguous'){invalid.push({row,reason:`Class match is ambiguous: ${className} ${division} ${academicYear}`});continue;}
    const duplicateKey=studentId||`${key}|${rollNumber}|${name}`;if(seen.has(duplicateKey)){duplicates.push({row,reason:'Duplicate student row in file'});continue;}seen.add(duplicateKey);
    const existing=studentId?byStudentId.get(studentId):undefined; const same=!!existing&&existing.rollNumber===rollNumber&&existing.name===name&&(existing.admissionNumber||'')===admissionNumber&&existing.classId===plan.classId;
    students.push({studentId:existing?.id,classKey:key,rollNumber,name,admissionNumber,status:existing?(same?'unchanged':'update'):'create',existing});
  } return {classes:[...classes.values()],students,invalid,duplicates};
}

export function studentsWithClassToCsv(students: Student[], cls: ClassRoom): string { return toCsv(students.map(s=>({student_id:s.id,class_id:cls.id,class_name:cls.name,division:cls.division,academic_year:cls.academicYear,roll_number:s.rollNumber,name:s.name,admission_number:s.admissionNumber??''}))); }

// Roll number only import
export interface RollNumberImportRow {
  student_id: string;
  name: string;
  roll_number: string;
}

export interface RollNumberImportPreview {
  toUpdate: { student_id: string; roll_number: string; name: string }[];
  invalid: { row: CsvRow; reason: string }[];
  unchanged: { student_id: string; roll_number: string; name: string }[];
}

export function previewRollNumberImport(rows: CsvRow[], existingStudents: Student[]): RollNumberImportPreview {
  const existingById = new Map(existingStudents.map((s) => [s.id, s]));
  const toUpdate: RollNumberImportPreview['toUpdate'] = [];
  const invalid: RollNumberImportPreview['invalid'] = [];
  const unchanged: RollNumberImportPreview['unchanged'] = [];

  for (const row of rows) {
    const studentId = (row.student_id || '').trim();
    const rollNumber = (row.roll_number || '').trim();
    const name = (row.name || '').trim();

    if (!studentId) {
      invalid.push({ row, reason: 'student_id is required' });
      continue;
    }
    if (!rollNumber) {
      invalid.push({ row, reason: 'roll_number is required' });
      continue;
    }

    const existing = existingById.get(studentId);
    if (!existing) {
      invalid.push({ row, reason: `Student not found: ${studentId}` });
      continue;
    }
    if (existing.rollNumber === rollNumber) {
      unchanged.push({ student_id: studentId, roll_number: rollNumber, name });
    } else {
      toUpdate.push({ student_id: studentId, roll_number: rollNumber, name });
    }
  }

  return { toUpdate, invalid, unchanged };
}

// Marks CSV
export interface MarksImportRow {
  student_id: string;
  roll_number: string;
  name: string;
  marks: string;
}

export interface MarksImportPreview {
  toUpdate: { student_id: string; marks: number | null }[];
  invalid: { row: CsvRow; reason: string }[];
  unchanged: { student_id: string; marks: number | null }[];
}

export function previewMarksImport(
  rows: CsvRow[],
  existingStudents: Student[],
  existingMarks: Map<string, number | null>,
  maxMarks: number,
  allowOverMax: boolean,
): MarksImportPreview {
  const existingById = new Map(existingStudents.map((s) => [s.id, s]));
  const toUpdate: MarksImportPreview['toUpdate'] = [];
  const invalid: MarksImportPreview['invalid'] = [];
  const unchanged: MarksImportPreview['unchanged'] = [];

  for (const row of rows) {
    const studentId = (row.student_id || '').trim();
    const marksStr = (row.marks || '').trim();

    if (!studentId) {
      invalid.push({ row, reason: 'student_id is required' });
      continue;
    }
    const existing = existingById.get(studentId);
    if (!existing) {
      invalid.push({ row, reason: `Student not found: ${studentId}` });
      continue;
    }

    let marks: number | null;
    if (marksStr === '' || marksStr.toLowerCase() === 'absent' || marksStr === '-') {
      marks = null;
    } else {
      const parsed = parseFloat(marksStr);
      if (isNaN(parsed)) {
        invalid.push({ row, reason: `Invalid marks: ${marksStr}` });
        continue;
      }
      if (parsed < 0) {
        invalid.push({ row, reason: 'Marks cannot be negative' });
        continue;
      }
      if (!allowOverMax && parsed > maxMarks) {
        invalid.push({ row, reason: `Marks exceed maximum (${maxMarks})` });
        continue;
      }
      marks = parsed;
    }

    const current = existingMarks.get(studentId);
    if (current === marks || (current === undefined && marks === null)) {
      unchanged.push({ student_id: studentId, marks });
    } else {
      toUpdate.push({ student_id: studentId, marks });
    }
  }

  return { toUpdate, invalid, unchanged };
}

export function marksToCsv(
  students: Student[],
  marksMap: Map<string, number | null>,
): string {
  const rows = students.map((s) => ({
    student_id: s.id,
    roll_number: s.rollNumber,
    name: s.name,
    marks: marksMap.get(s.id) ?? '',
  }));
  return toCsv(rows);
}

export function blankMarksTemplate(students: Student[]): string {
  const rows = students.map((s) => ({
    student_id: s.id,
    roll_number: s.rollNumber,
    name: s.name,
    marks: '',
  }));
  return toCsv(rows);
}

// Plus One marks CSV
export function plusOneMarksToCsv(
  students: Student[],
  marksMap: Map<string, { te: number | null; ce: number | null }>,
): string {
  const rows = students.map((s) => {
    const m = marksMap.get(s.id);
    return {
      student_id: s.id,
      roll_number: s.rollNumber,
      name: s.name,
      ce_marks: m?.ce ?? '',
      te_marks: m?.te ?? '',
    };
  });
  return toCsv(rows);
}

export function blankPlusOneMarksTemplate(students: Student[]): string {
  const rows = students.map((s) => ({
    student_id: s.id,
    roll_number: s.rollNumber,
    name: s.name,
    ce_marks: '',
    te_marks: '',
  }));
  return toCsv(rows);
}

export interface PlusOneMarksImportPreview {
  toUpdate: { student_id: string; ce_marks: number | null; te_marks: number | null }[];
  invalid: { row: CsvRow; reason: string }[];
  unchanged: { student_id: string; ce_marks: number | null; te_marks: number | null }[];
}

export function previewPlusOneMarksImport(
  rows: CsvRow[],
  existingStudents: Student[],
  existingMarks: Map<string, { te: number | null; ce: number | null }>,
  maxTE: number,
  maxCE: number,
): PlusOneMarksImportPreview {
  const existingById = new Map(existingStudents.map((s) => [s.id, s]));
  const toUpdate: PlusOneMarksImportPreview['toUpdate'] = [];
  const invalid: PlusOneMarksImportPreview['invalid'] = [];
  const unchanged: PlusOneMarksImportPreview['unchanged'] = [];

  for (const row of rows) {
    const studentId = (row.student_id || '').trim();
    const teStr = (row.te_marks || '').trim();
    const ceStr = (row.ce_marks || '').trim();

    if (!studentId) {
      invalid.push({ row, reason: 'student_id is required' });
      continue;
    }
    const existing = existingById.get(studentId);
    if (!existing) {
      invalid.push({ row, reason: `Student not found: ${studentId}` });
      continue;
    }

    let te: number | null;
    let ce: number | null;

    if (teStr === '' || teStr === '-') te = null;
    else {
      te = parseFloat(teStr);
      if (isNaN(te) || te < 0 || te > maxTE) {
        invalid.push({ row, reason: `Invalid TE marks (0-${maxTE})` });
        continue;
      }
    }
    if (ceStr === '' || ceStr === '-') ce = null;
    else {
      ce = parseFloat(ceStr);
      if (isNaN(ce) || ce < 0 || ce > maxCE) {
        invalid.push({ row, reason: `Invalid CE marks (0-${maxCE})` });
        continue;
      }
    }

    const current = existingMarks.get(studentId);
    if (current && current.te === te && current.ce === ce) {
      unchanged.push({ student_id: studentId, ce_marks: ce, te_marks: te });
    } else {
      toUpdate.push({ student_id: studentId, ce_marks: ce, te_marks: te });
    }
  }

  return { toUpdate, invalid, unchanged };
}
