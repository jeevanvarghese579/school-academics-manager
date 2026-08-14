import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Upload, FileSpreadsheet, Database, GraduationCap, Users, ClipboardCheck, Award } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { ClassRoom, Student, Exam, ExamMark, PlusOneMark, UserSettings } from '@/types';
import {
  studentsToCsv, blankStudentTemplate, marksToCsv, blankMarksTemplate,
  plusOneMarksToCsv, blankPlusOneMarksTemplate, downloadFile,
} from '@/utils/csv';

export function ImportExport() {
  const { repo, mode } = useApp();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearOpen, setClearOpen] = useState(false);
  const backupRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      if (!repo) return;
      try {
        const [cls, exs] = await Promise.all([repo.getClasses(), repo.getExams()]);
        setClasses(cls);
        setExams(exs);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [repo]);

  const handleExportBackup = async () => {
    if (!repo) return;
    try {
      const data = await repo.exportBackup();
      downloadFile(JSON.stringify(data, null, 2), 'sam_backup.json', 'application/json');
      toast('Backup exported', 'success');
    } catch (err: any) { toast(err.message || 'Failed', 'error'); }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!repo) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !data.classes) { toast('Invalid backup file', 'error'); return; }
      await repo.importBackup(data);
      toast('Backup restored', 'success');
    } catch (err: any) { toast(err.message || 'Failed to restore', 'error'); }
    if (backupRef.current) backupRef.current.value = '';
  };

  const handleClear = async () => {
    if (!repo) return;
    try { await repo.clearAllData(); toast('All data cleared', 'success'); }
    catch (err: any) { toast(err.message || 'Failed', 'error'); }
  };

  const handleExportStudents = async (classId: string) => {
    if (!repo) return;
    try {
      const students = await repo.getStudents(classId);
      if (students.length === 0) { toast('No students to export', 'info'); return; }
      const cls = classes.find((c) => c.id === classId);
      downloadFile(studentsToCsv(students), `${cls?.name || 'class'}_students.csv`);
      toast('Exported student CSV', 'success');
    } catch (err: any) { toast(err.message || 'Failed', 'error'); }
  };

  const handleExportMarks = async (examId: string) => {
    if (!repo) return;
    try {
      const exam = exams.find((e) => e.id === examId);
      if (!exam) return;
      const students = await repo.getStudents(exam.classId);
      if (exam.type === 'plusOne') {
        const pom = await repo.getPlusOneMarks(examId);
        const m = new Map<string, { te: number | null; ce: number | null }>();
        for (const p of pom) m.set(p.studentId, { te: p.teMarks, ce: p.ceMarks });
        downloadFile(plusOneMarksToCsv(students, m), `${exam.name}_marks.csv`);
      } else {
        const em = await repo.getExamMarks(examId);
        const m = new Map<string, number | null>();
        for (const mk of em) m.set(mk.studentId, mk.marks);
        downloadFile(marksToCsv(students, m), `${exam.name}_marks.csv`);
      }
      toast('Exported marks CSV', 'success');
    } catch (err: any) { toast(err.message || 'Failed', 'error'); }
  };

  if (loading) return <div className="space-y-4"><div className="skeleton h-8 w-40" /><div className="skeleton h-64" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Import / Export</h1>

      {classes.length === 0 ? (
        <EmptyState icon={<Database className="w-8 h-8" />} title="Nothing to export yet" description="Create classes and add data first." action={<Link to="/classes" className="btn-primary">Go to Classes</Link>} />
      ) : (
        <>
          {/* Full Backup */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4"><Database className="w-5 h-5 text-primary-600 dark:text-primary-400" /><h2 className="font-semibold text-gray-900 dark:text-white">Full Backup</h2></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Export or restore a complete JSON backup of all your data (classes, students, exams, marks, assignments, grace marks, and settings).</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleExportBackup} className="btn-secondary"><Download className="w-4 h-4" /> Export Full Backup</button>
              {mode === 'offline' && (
                <>
                  <button onClick={() => backupRef.current?.click()} className="btn-secondary"><Upload className="w-4 h-4" /> Import Backup</button>
                  <input ref={backupRef} type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                </>
              )}
            </div>
          </div>

          {/* Student CSV */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4"><Users className="w-5 h-5 text-primary-600 dark:text-primary-400" /><h2 className="font-semibold text-gray-900 dark:text-white">Student CSV Export</h2></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Export student data for a specific class. The CSV includes stable student IDs for safe re-import.</p>
            <div className="space-y-2">
              {classes.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name} {c.division}</p>
                    <p className="text-xs text-gray-400">{c.academicYear}</p>
                  </div>
                  <button onClick={() => handleExportStudents(c.id)} className="btn-ghost text-sm"><Download className="w-4 h-4" /> Export</button>
                </div>
              ))}
            </div>
            <button onClick={() => { downloadFile(blankStudentTemplate(), 'student_template.csv'); toast('Template downloaded', 'success'); }} className="btn-ghost text-sm mt-3">
              <FileSpreadsheet className="w-4 h-4" /> Download Blank Student Template
            </button>
          </div>

          {/* Marks CSV */}
          {exams.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4"><ClipboardCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" /><h2 className="font-semibold text-gray-900 dark:text-white">Marks CSV Export</h2></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Export exam marks for editing in Excel/Sheets and re-importing.</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {exams.map((ex) => {
                  const cls = classes.find((c) => c.id === ex.classId);
                  return (
                    <div key={ex.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{ex.name}</p>
                        <p className="text-xs text-gray-400">{cls?.name} {cls?.division} · {ex.type === 'plusOne' ? 'Plus One' : `Max ${ex.maxMarks}`}</p>
                      </div>
                      <button onClick={() => handleExportMarks(ex.id)} className="btn-ghost text-sm"><Download className="w-4 h-4" /> Export</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clear Data (offline only) */}
          {mode === 'offline' && (
            <div className="card p-6 border-error-200 dark:border-error-900">
              <h2 className="font-semibold text-error-600 dark:text-error-400 mb-2">Danger Zone</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Permanently delete all data from this device.</p>
              <button onClick={() => setClearOpen(true)} className="btn-danger"><Database className="w-4 h-4" /> Clear All Local Data</button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog open={clearOpen} onClose={() => setClearOpen(false)} onConfirm={handleClear}
        title="Clear All Data" message="This will permanently delete ALL data from this device. This cannot be undone."
        confirmLabel="Delete Everything" danger strong
      />
    </div>
  );
}
