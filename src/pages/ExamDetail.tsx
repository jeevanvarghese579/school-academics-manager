import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, Download, Save, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
  Award, ClipboardCheck, Calculator,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Exam, Student, ExamMark, PlusOneMark, UserSettings } from '@/types';
import { calcPercentage, calcPlusOneResult, formatPercent, formatNumber } from '@/utils/calculations';
import {
  parseCsv, marksToCsv, blankMarksTemplate, previewMarksImport, downloadFile,
  plusOneMarksToCsv, blankPlusOneMarksTemplate, previewPlusOneMarksImport,
} from '@/utils/csv';

export function ExamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { repo } = useApp();
  const { toast } = useToast();
  const [exam, setExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [marksMap, setMarksMap] = useState<Map<string, number | null>>(new Map());
  const [plusOneMap, setPlusOneMap] = useState<Map<string, { te: number | null; ce: number | null }>>(new Map());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [importModal, setImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<ReturnType<typeof previewMarksImport> | null>(null);
  const [plusOneImportPreview, setPlusOneImportPreview] = useState<ReturnType<typeof previewPlusOneMarksImport> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isPlusOne = exam?.type === 'plusOne';

  const load = async () => {
    if (!repo || !id) return;
    try {
      const ex = await repo.getExam(id);
      const setts = await repo.getSettings();
      setExam(ex);
      setSettings(setts);
      if (ex) {
        const sts = await repo.getStudents(ex.classId);
        setStudents(sts.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })));
        if (ex.type === 'plusOne') {
          const pom = await repo.getPlusOneMarks(id);
          const m = new Map<string, { te: number | null; ce: number | null }>();
          for (const p of pom) m.set(p.studentId, { te: p.teMarks, ce: p.ceMarks });
          setPlusOneMap(m);
        } else {
          const em = await repo.getExamMarks(id);
          const m = new Map<string, number | null>();
          for (const mk of em) m.set(mk.studentId, mk.marks);
          setMarksMap(m);
        }
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [repo, id]);

  const maxMarks = exam?.maxMarks || 100;
  const allowOverMax = settings?.allowMarksOverMax ?? false;

  const validateMark = (val: number): string | null => {
    if (val < 0) return 'Marks cannot be negative';
    if (!allowOverMax && val > maxMarks) return `Marks cannot exceed ${maxMarks}`;
    return null;
  };

  const handleMarkChange = (studentId: string, value: string) => {
    if (!exam) return;
    if (value === '' || value === '-' || value.toLowerCase() === 'absent') {
      setMarksMap((prev) => { const n = new Map(prev); n.set(studentId, null); return n; });
      setDirty(true);
      return;
    }
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const err = validateMark(num);
    if (err) { toast(err, 'error'); return; }
    setMarksMap((prev) => { const n = new Map(prev); n.set(studentId, num); return n; });
    setDirty(true);
  };

  const handlePlusOneChange = (studentId: string, field: 'te' | 'ce', value: string) => {
    if (!settings) return;
    const max = field === 'te' ? settings.plusOneMaxTE : settings.plusOneMaxCE;
    if (value === '' || value === '-') {
      setPlusOneMap((prev) => {
        const n = new Map(prev);
        const cur = n.get(studentId) || { te: null, ce: null };
        n.set(studentId, { ...cur, [field]: null });
        return n;
      });
      setDirty(true);
      return;
    }
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > max) { toast(`${field.toUpperCase()} marks must be 0–${max}`, 'error'); return; }
    setPlusOneMap((prev) => {
      const n = new Map(prev);
      const cur = n.get(studentId) || { te: null, ce: null };
      n.set(studentId, { ...cur, [field]: num });
      return n;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!repo || !exam || !id) return;
    setSaving(true);
    try {
      if (isPlusOne) {
        const entries: Omit<PlusOneMark, 'id' | 'createdAt' | 'updatedAt'>[] = [];
        for (const s of students) {
          const m = plusOneMap.get(s.id);
          if (m) entries.push({ examId: id, studentId: s.id, classId: exam.classId, teMarks: m.te, ceMarks: m.ce });
        }
        await repo.bulkSavePlusOneMarks(entries);
      } else {
        const entries: Omit<ExamMark, 'id' | 'createdAt' | 'updatedAt'>[] = [];
        for (const s of students) {
          if (marksMap.has(s.id)) entries.push({ examId: id, studentId: s.id, classId: exam.classId, marks: marksMap.get(s.id) ?? null });
        }
        await repo.bulkSaveExamMarks(entries);
      }
      setDirty(false);
      toast('Marks saved', 'success');
    } catch (err: any) { toast(err.message || 'Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  const handleExport = () => {
    if (!exam) return;
    if (isPlusOne) {
      const csv = plusOneMarksToCsv(students, plusOneMap);
      downloadFile(csv, `${exam.name}_plus_one_marks.csv`);
    } else {
      const csv = marksToCsv(students, marksMap);
      downloadFile(csv, `${exam.name}_marks.csv`);
    }
    toast('Exported CSV', 'success');
  };

  const handleTemplate = () => {
    if (isPlusOne) downloadFile(blankPlusOneMarksTemplate(students), 'plus_one_marks_template.csv');
    else downloadFile(blankMarksTemplate(students), 'marks_template.csv');
    toast('Template downloaded', 'success');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!exam || !settings) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    if (isPlusOne) {
      const existingMarks = new Map<string, { te: number | null; ce: number | null }>();
      for (const s of students) {
        const m = plusOneMap.get(s.id);
        existingMarks.set(s.id, m || { te: null, ce: null });
      }
      const preview = previewPlusOneMarksImport(rows, students, existingMarks, settings.plusOneMaxTE, settings.plusOneMaxCE);
      setPlusOneImportPreview(preview);
    } else {
      const existingMarks = new Map<string, number | null>();
      for (const s of students) existingMarks.set(s.id, marksMap.get(s.id) ?? null);
      const preview = previewMarksImport(rows, students, existingMarks, maxMarks, allowOverMax);
      setImportPreview(preview);
    }
  };

  const handleApplyImport = async () => {
    if (!repo || !exam || !id) return;
    try {
      if (isPlusOne && plusOneImportPreview) {
        for (const u of plusOneImportPreview.toUpdate) {
          setPlusOneMap((prev) => {
            const n = new Map(prev);
            const cur = n.get(u.student_id) || { te: null, ce: null };
            n.set(u.student_id, { te: u.te_marks ?? cur.te, ce: u.ce_marks ?? cur.ce });
            return n;
          });
        }
        setDirty(true);
        toast(`${plusOneImportPreview.toUpdate.length} marks updated. Don't forget to save.`, 'success');
      } else if (importPreview) {
        for (const u of importPreview.toUpdate) {
          setMarksMap((prev) => { const n = new Map(prev); n.set(u.student_id, u.marks); return n; });
        }
        setDirty(true);
        toast(`${importPreview.toUpdate.length} marks updated. Don't forget to save.`, 'success');
      }
      setImportModal(false);
      setImportPreview(null);
      setPlusOneImportPreview(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) { toast(err.message || 'Import failed', 'error'); }
  };

  const closeImport = () => {
    setImportModal(false);
    setImportPreview(null);
    setPlusOneImportPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (loading) return <div className="space-y-4"><div className="skeleton h-8 w-64" /><div className="skeleton h-96" /></div>;
  if (!exam) return <EmptyState title="Exam not found" description="This exam may have been deleted." action={<Link to="/exams" className="btn-primary">Back to Exams</Link>} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/exams')} className="btn-icon" aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isPlusOne ? <Award className="w-5 h-5 text-accent-600 dark:text-accent-400" /> : <ClipboardCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{exam.name}</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isPlusOne ? 'Plus One Public Exam' : `Maximum marks: ${exam.maxMarks}`}
            {exam.subject && ` · ${exam.subject}`}
            {exam.date && ` · ${exam.date}`}
          </p>
        </div>
      </div>

      {students.length === 0 ? (
        <EmptyState title="No students in this class" description="Add students to the class before entering marks." action={<Link to={`/classes/${exam.classId}`} className="btn-primary">Go to Class</Link>} />
      ) : (
        <>
          {/* Action bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 no-print">
            <div className="flex items-center gap-2">
              <button onClick={handleExport} className="btn-secondary"><Download className="w-4 h-4" /> Export</button>
              <button onClick={() => setImportModal(true)} className="btn-secondary"><Upload className="w-4 h-4" /> Import</button>
              <button onClick={handleTemplate} className="btn-ghost" title="Download template">Template</button>
            </div>
            <div className="flex items-center gap-3">
              {dirty && (
                <span className="flex items-center gap-1.5 text-sm text-warning-600 dark:text-warning-400">
                  <AlertCircle className="w-4 h-4" /> Unsaved changes
                </span>
              )}
              <button onClick={handleSave} disabled={saving || !dirty} className="btn-primary">
                {saving ? <span className="animate-pulse">Saving...</span> : <><Save className="w-4 h-4" /> Save</>}
              </button>
            </div>
          </div>

          {/* Desktop marks table */}
          {!isPlusOne && (
            <div className="card overflow-hidden hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">Roll No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Marks</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const marks = marksMap.get(s.id) ?? null;
                      const pct = calcPercentage(marks, maxMarks);
                      return (
                        <tr key={s.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">{s.rollNumber}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{s.name}</td>
                          <td className="px-4 py-2.5">
                            <input
                              type="number"
                              className="input py-1.5 px-2 text-sm w-24"
                              value={marks ?? ''}
                              onChange={(e) => handleMarkChange(s.id, e.target.value)}
                              placeholder="—"
                              min="0"
                              max={allowOverMax ? undefined : maxMarks}
                              step="0.5"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                            {pct !== null ? formatPercent(pct, settings?.decimalPlaces ?? 2) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Desktop Plus One table */}
          {isPlusOne && settings && (
            <div className="card overflow-hidden hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">Roll</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">TE (/{settings.plusOneMaxTE})</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">CE (/{settings.plusOneMaxCE})</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">%</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const m = plusOneMap.get(s.id) || { te: null, ce: null };
                      const result = calcPlusOneResult(m.te, m.ce, settings);
                      return (
                        <tr key={s.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">{s.rollNumber}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{s.name}</td>
                          <td className="px-4 py-2.5">
                            <input type="number" className="input py-1.5 px-2 text-sm w-20" value={m.te ?? ''} onChange={(e) => handlePlusOneChange(s.id, 'te', e.target.value)} placeholder="—" min="0" max={settings.plusOneMaxTE} step="0.5" />
                          </td>
                          <td className="px-4 py-2.5">
                            <input type="number" className="input py-1.5 px-2 text-sm w-20" value={m.ce ?? ''} onChange={(e) => handlePlusOneChange(s.id, 'ce', e.target.value)} placeholder="—" min="0" max={settings.plusOneMaxCE} step="0.5" />
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{result.total !== null ? formatNumber(result.total, settings.decimalPlaces) : '—'}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{result.percentage !== null ? formatPercent(result.percentage, settings.decimalPlaces) : '—'}</td>
                          <td className="px-4 py-2.5">
                            {result.isIncomplete ? <span className="chip bg-gray-100 dark:bg-gray-800 text-gray-500">Incomplete</span> :
                             result.doublePass ? <span className="chip bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300"><CheckCircle2 className="w-3 h-3" /> Double Pass</span> :
                             result.passed ? <span className="chip bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">Passed</span> :
                             <span className="chip bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-300">Failed</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mobile marks entry */}
          <div className="md:hidden no-print">
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <button onClick={() => setMobileIndex(Math.max(0, mobileIndex - 1))} disabled={mobileIndex === 0} className="btn-icon"><ChevronLeft className="w-5 h-5" /></button>
                <span className="text-sm text-gray-500 dark:text-gray-400">{mobileIndex + 1} / {students.length}</span>
                <button onClick={() => setMobileIndex(Math.min(students.length - 1, mobileIndex + 1))} disabled={mobileIndex === students.length - 1} className="btn-icon"><ChevronRight className="w-5 h-5" /></button>
              </div>
              {(() => {
                const s = students[mobileIndex];
                if (!s) return null;
                if (isPlusOne && settings) {
                  const m = plusOneMap.get(s.id) || { te: null, ce: null };
                  const result = calcPlusOneResult(m.te, m.ce, settings);
                  return (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Roll {s.rollNumber}</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{s.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">TE Marks (/{settings.plusOneMaxTE})</label>
                          <input type="number" className="input text-lg text-center py-3" value={m.te ?? ''} onChange={(e) => handlePlusOneChange(s.id, 'te', e.target.value)} placeholder="—" min="0" max={settings.plusOneMaxTE} step="0.5" />
                        </div>
                        <div>
                          <label className="label">CE Marks (/{settings.plusOneMaxCE})</label>
                          <input type="number" className="input text-lg text-center py-3" value={m.ce ?? ''} onChange={(e) => handlePlusOneChange(s.id, 'ce', e.target.value)} placeholder="—" min="0" max={settings.plusOneMaxCE} step="0.5" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="card p-3"><p className="text-xs text-gray-400">Total</p><p className="text-lg font-bold">{result.total !== null ? formatNumber(result.total, 2) : '—'}</p></div>
                        <div className="card p-3"><p className="text-xs text-gray-400">Percentage</p><p className="text-lg font-bold">{result.percentage !== null ? formatPercent(result.percentage, 2) : '—'}</p></div>
                      </div>
                      <div className="text-center">
                        {result.isIncomplete ? <span className="chip bg-gray-100 dark:bg-gray-800 text-gray-500">Incomplete</span> :
                         result.doublePass ? <span className="chip bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300">Double Pass</span> :
                         result.passed ? <span className="chip bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">Passed</span> :
                         <span className="chip bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-300">Failed</span>}
                      </div>
                    </div>
                  );
                }
                const marks = marksMap.get(s.id) ?? null;
                const pct = calcPercentage(marks, maxMarks);
                return (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Roll {s.rollNumber}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{s.name}</p>
                    </div>
                    <div>
                      <label className="label">Marks (/{maxMarks})</label>
                      <input type="number" className="input text-lg text-center py-3" value={marks ?? ''} onChange={(e) => handleMarkChange(s.id, e.target.value)} placeholder="—" min="0" max={allowOverMax ? undefined : maxMarks} step="0.5" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Percentage</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{pct !== null ? formatPercent(pct, 2) : '—'}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* Import Modal */}
      <Modal open={importModal} onClose={closeImport} title="Import Marks" size="lg"
        footer={importPreview || plusOneImportPreview ? (
          <><button className="btn-secondary" onClick={closeImport}>Cancel</button>
            <button className="btn-primary" onClick={handleApplyImport}>Apply Import</button></>
        ) : <button className="btn-secondary" onClick={closeImport}>Close</button>}
      >
        {!importPreview && !plusOneImportPreview ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Select a CSV file to import marks</p>
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFileSelect} className="hidden" id="marks-upload" />
              <label htmlFor="marks-upload" className="btn-secondary cursor-pointer inline-flex">Choose File</label>
            </div>
            <button onClick={handleTemplate} className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
              <Download className="w-3.5 h-3.5" /> Download template
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {importPreview && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <ImportStat label="Updated" value={importPreview.toUpdate.length} color="primary" />
                  <ImportStat label="Unchanged" value={importPreview.unchanged.length} color="secondary" />
                  <ImportStat label="Invalid" value={importPreview.invalid.length} color="error" />
                </div>
                {importPreview.invalid.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-error-600">Invalid Rows</h4>
                    <div className="max-h-40 overflow-y-auto card p-2">
                      {importPreview.invalid.map((r, i) => <div key={i} className="text-xs py-1 px-2 text-error-600 dark:text-error-400">{r.reason}</div>)}
                    </div>
                  </div>
                )}
              </>
            )}
            {plusOneImportPreview && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <ImportStat label="Updated" value={plusOneImportPreview.toUpdate.length} color="primary" />
                  <ImportStat label="Unchanged" value={plusOneImportPreview.unchanged.length} color="secondary" />
                  <ImportStat label="Invalid" value={plusOneImportPreview.invalid.length} color="error" />
                </div>
                {plusOneImportPreview.invalid.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-error-600">Invalid Rows</h4>
                    <div className="max-h-40 overflow-y-auto card p-2">
                      {plusOneImportPreview.invalid.map((r, i) => <div key={i} className="text-xs py-1 px-2 text-error-600 dark:text-error-400">{r.reason}</div>)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function ImportStat({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300',
    secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    error: 'bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300',
  };
  return (
    <div className={`rounded-xl p-3 text-center ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
}
