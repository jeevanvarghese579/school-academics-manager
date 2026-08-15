import type { BackupData } from '@/types';

export const BACKUP_FORMAT = 'students-academics-manager-backup';
export const BACKUP_SCHEMA_VERSION = 1;
export interface FullBackup { format: typeof BACKUP_FORMAT; schemaVersion: number; appVersion: string; exportedAt: string; data: BackupData; }
const collections: (keyof Omit<BackupData, 'version' | 'exportedAt' | 'settings'>)[] = ['classes', 'students', 'exams', 'examMarks', 'plusOneMarks', 'assignments', 'assignmentStatuses', 'graceMarks', 'combinedAnalyses'];

export function makeFullBackup(data: BackupData): FullBackup { return { format: BACKUP_FORMAT, schemaVersion: BACKUP_SCHEMA_VERSION, appVersion: data.version, exportedAt: data.exportedAt, data }; }
export function validateFullBackup(value: unknown): FullBackup {
  if (!value || typeof value !== 'object') throw new Error('Backup must be a JSON object.');
  const backup = value as Partial<FullBackup>;
  if (backup.format !== BACKUP_FORMAT) throw new Error('This is not a Students Academics Manager backup.');
  if (backup.schemaVersion !== BACKUP_SCHEMA_VERSION) throw new Error(`Unsupported backup schema version: ${String(backup.schemaVersion)}.`);
  if (!backup.data || typeof backup.data !== 'object') throw new Error('Backup data is missing.');
  const data = backup.data as Partial<BackupData>;
  for (const name of collections) {
    if (!Array.isArray(data[name])) throw new Error(`Backup ${name} must be an array.`);
    if (!(data[name] as unknown[]).every(item => item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string')) throw new Error(`Every ${name} record must have an ID.`);
  }
  if (data.settings !== null && data.settings !== undefined && (typeof data.settings !== 'object' || typeof data.settings.id !== 'string')) throw new Error('Backup settings are malformed.');
  const ids = (name: keyof BackupData) => new Set(((data[name] as { id: string }[]) ?? []).map(x => x.id));
  const classIds = ids('classes'), studentIds = ids('students'), examIds = ids('exams'), assignmentIds = ids('assignments');
  const check = (records: object[], fields: [string, Set<string>][]) => records.every(item => { const record = item as Record<string, unknown>; return fields.every(([field, valid]) => typeof record[field] === 'string' && valid.has(record[field] as string)); });
  if (!check(data.students ?? [], [['classId', classIds]]) || !check(data.exams ?? [], [['classId', classIds]]) || !check(data.assignments ?? [], [['classId', classIds]]) || !check(data.graceMarks ?? [], [['classId', classIds], ['studentId', studentIds]]) || !check(data.examMarks ?? [], [['classId', classIds], ['studentId', studentIds], ['examId', examIds]]) || !check(data.plusOneMarks ?? [], [['classId', classIds], ['studentId', studentIds], ['examId', examIds]]) || !check(data.assignmentStatuses ?? [], [['classId', classIds], ['studentId', studentIds], ['assignmentId', assignmentIds]]) || !(data.combinedAnalyses ?? []).every(a => typeof a.classId === 'string' && classIds.has(a.classId) && Array.isArray(a.examIds) && a.examIds.every(id => examIds.has(id)))) throw new Error('Backup contains records with invalid relationships.');
  return backup as FullBackup;
}

export function backupSummary(backup: FullBackup) { const d = backup.data; return { classes: d.classes.length, students: d.students.length, exams: d.exams.length, assignments: d.assignments.length, marks: d.examMarks.length + d.plusOneMarks.length, statuses: d.assignmentStatuses.length, graceMarks: d.graceMarks.length, analyses: d.combinedAnalyses?.length ?? 0 }; }
