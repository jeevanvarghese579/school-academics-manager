import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Pencil, Trash2, ArrowLeft, Users, Upload, Download, FileSpreadsheet,
  CheckSquare, Square, X, ChevronUp, ChevronDown, RefreshCw,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ClassRoom, Student } from '@/types';
import {
  parseCsv, studentsToCsv, blankStudentTemplate, previewStudentImport,
  downloadFile, previewRollNumberImport,
} from '@/utils/csv';

type SortKey = 'rollNumber' | 'name';
type SortDir = 'asc' | 'desc';

export function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { repo } = useApp();
  const { toast } = useToast();
  const [cls, setCls] = useState<ClassRoom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rollNumber');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [formData, setFormData] = useState({ rollNumber: '', name: '', admissionNumber: '', notes: '' });
  const [importModal, setImportModal] = useState(false);
  const [importStep, setImportStep] = useState<'select' | 'preview'>('select');
  const [importPreview, setImportPreview] = useState<ReturnType<typeof previewStudentImport> | null>(null);
  const [importRollOnly, setImportRollOnly] = useState(false);
  const [rollPreview, setRollPreview] = useState<ReturnType<typeof previewRollNumberImport> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!repo || !id) return;
    try {
      const [c, sts] = await Promise.all([repo.getClass(id), repo.getStudents(id)]);
      setCls(c);
      setStudents(sts);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [repo, id]);

  const sortedFiltered = [...students]
    .filter((s) => {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.rollNumber.includes(q) || (s.admissionNumber ?? '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'rollNumber') cmp = a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true });
      else cmp = a.name.localeCompare(b.name);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const toggleSelect = (sid: string) => {
    const next = new Set(selected);
    if (next.has(sid)) next.delete(sid); else next.add(sid);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === sortedFiltered.length) setSelected(new Set());
    else setSelected(new Set(sortedFiltered.map((s) => s.id)));
  };

  const handleSave = async () => {
    if (!repo || !id) return;
    if (!formData.name.trim()) { toast('Name is required', 'error'); return; }
    if (!formData.rollNumber.trim()) { toast('Roll number is required', 'error'); return; }
    const dupRoll = students.find((s) => s.rollNumber === formData.rollNumber && s.id !== editing?.id);
    if (dupRoll) { toast(`Roll number ${formData.rollNumber} already exists`, 'error'); return; }
    try {
      if (editing) {
        await repo.updateStudent({ ...editing, classId: id, rollNumber: formData.rollNumber, name: formData.name, admissionNumber: formData.admissionNumber || undefined, notes: formData.notes || undefined });
        toast('Student updated', 'success');
      } else {
        await repo.createStudent({ classId: id, rollNumber: formData.rollNumber, name: formData.name, admissionNumber: formData.admissionNumber || undefined, notes: formData.notes || undefined });
        toast('Student added', 'success');
      }
      setModalOpen(false);
      setEditing(null);
      setFormData({ rollNumber: '', name: '', admissionNumber: '', notes: '' });
      await load();
    } catch (err: any) {
      toast(err.message || 'Failed to save', 'error');
    }
  };

  const handleDelete = async () => {
    if (!repo || !deleteTarget) return;
    try {
      await repo.deleteStudent(deleteTarget.id);
      toast('Student deleted', 'success', { label: 'Undo', onClick: async () => {
        await repo.createStudent({ classId: deleteTarget.classId, rollNumber: deleteTarget.rollNumber, name: deleteTarget.name, admissionNumber: deleteTarget.admissionNumber, notes: deleteTarget.notes });
        await load();
      }});
      await load();
    } catch (err: any) {
      toast(err.message || 'Failed to delete', 'error');
    }
  };

  const handleExport = (onlySelected: boolean) => {
    const toExport = onlySelected ? students.filter((s) => selected.has(s.id)) : students;
    if (toExport.length === 0) { toast('No students to export', 'info'); return; }
    const csv = studentsToCsv(toExport);
    downloadFile(csv, `${cls?.name || 'class'}_students.csv`);
    toast('Exported CSV', 'success');
  };

  const handleTemplate = () => {
    downloadFile(blankStudentTemplate(), 'student_template.csv');
    toast('Template downloaded', 'success');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    if (importRollOnly) {
      const preview = previewRollNumberImport(rows, students);
      setRollPreview(preview);
    } else {
      const preview = previewStudentImport(rows, students);
      setImportPreview(preview);
    }
    setImportStep('preview');
  };

  const handleApplyImport = async () => {
    if (!repo || !id) return;
    try {
      if (importRollOnly && rollPreview) {
        for (const u of rollPreview.toUpdate) {
          const existing = students.find((s) => s.id === u.student_id);
          if (existing) await repo.updateStudent({ ...existing, rollNumber: u.roll_number });
        }
        toast(`${rollPreview.toUpdate.length} students updated`, 'success');
      } else if (importPreview) {
        for (const c of importPreview.toCreate) {
          await repo.createStudent({ classId: id, rollNumber: c.roll_number, name: c.name, admissionNumber: c.admission_number || undefined });
        }
        for (const u of importPreview.toUpdate) {
          const existing = students.find((s) => s.id === u.student_id);
          if (existing) await repo.updateStudent({ ...existing, rollNumber: u.roll_number, name: u.name, admissionNumber: u.admission_number || undefined });
        }
        toast(`${importPreview.toCreate.length} created, ${importPreview.toUpdate.length} updated`, 'success');
      }
      setImportModal(false);
      setImportStep('select');
      setImportPreview(null);
      setRollPreview(null);
      setImportRollOnly(false);
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err: any) {
      toast(err.message || 'Import failed', 'error');
    }
  };

  const closeImport = () => {
    setImportModal(false);
    setImportStep('select');
    setImportPreview(null);
    setRollPreview(null);
    setImportRollOnly(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (loading) {
    return <div className="space-y-4"><div className="skeleton h-8 w-64" /><div className="skeleton h-64" /></div>;
  }

  if (!cls) {
    return (
      <div>
        <EmptyState title="Class not found" description="This class may have been deleted." action={<Link to="/classes" className="btn-primary">Back to Classes</Link>} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/classes')} className="btn-icon" aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{cls.name} {cls.division}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{cls.academicYear}</p>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Student
          </button>
          <button onClick={() => setImportModal(true)} className="btn-secondary">
            <Upload className="w-4 h-4" /> Import
          </button>
          <div className="relative">
            <button onClick={() => handleExport(false)} className="btn-secondary">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
          <button onClick={handleTemplate} className="btn-ghost" title="Download blank template">
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
        {selected.size > 0 && (
          <button onClick={() => handleExport(true)} className="btn-secondary">
            <Download className="w-4 h-4" /> Export Selected ({selected.size})
          </button>
        )}
      </div>

      {students.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-10" placeholder="Search by name, roll number, admission number..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      {students.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No students in this class"
          description="Add students one by one or import from a CSV file."
          action={<button onClick={() => setModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4" />Add Student</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left w-10">
                    <button onClick={toggleSelectAll} className="btn-icon w-8 h-8" aria-label="Select all">
                      {selected.size === sortedFiltered.length && sortedFiltered.length > 0
                        ? <CheckSquare className="w-4 h-4 text-primary-600" />
                        : <Square className="w-4 h-4 text-gray-400" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('rollNumber')}>
                    <span className="flex items-center gap-1">Roll No {sortKey === 'rollNumber' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('name')}>
                    <span className="flex items-center gap-1">Name {sortKey === 'name' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Admission No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Notes</th>
                  <th className="px-4 py-3 text-right w-20"></th>
                </tr>
              </thead>
              <tbody>
                {sortedFiltered.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(s.id)} className="btn-icon w-8 h-8" aria-label="Select">
                        {selected.has(s.id) ? <CheckSquare className="w-4 h-4 text-primary-600" /> : <Square className="w-4 h-4 text-gray-300 dark:text-gray-600" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{s.rollNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">{s.admissionNumber || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell max-w-xs truncate">{s.notes || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditing(s); setFormData({ rollNumber: s.rollNumber, name: s.name, admissionNumber: s.admissionNumber || '', notes: s.notes || '' }); setModalOpen(true); }} className="btn-icon w-8 h-8" aria-label="Edit"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteTarget(s)} className="btn-icon w-8 h-8 text-error-500" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Student' : 'Add Student'}
        footer={<><button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>{editing ? 'Save' : 'Add'}</button></>}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="st-roll">Roll Number</label>
              <input id="st-roll" className="input" value={formData.rollNumber} onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })} placeholder="1" />
            </div>
            <div>
              <label className="label" htmlFor="st-adm">Admission No (optional)</label>
              <input id="st-adm" className="input" value={formData.admissionNumber} onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })} placeholder="—" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="st-name">Student Name</label>
            <input id="st-name" className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Student name" />
          </div>
          <div>
            <label className="label" htmlFor="st-notes">Notes (optional)</label>
            <textarea id="st-notes" className="input min-h-16" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal open={importModal} onClose={closeImport} title="Import Students" size="lg"
        footer={importStep === 'preview' ? (
          <>
            <button className="btn-secondary" onClick={() => setImportStep('select')}>Back</button>
            <button className="btn-primary" onClick={handleApplyImport}>
              Apply Import
            </button>
          </>
        ) : <button className="btn-secondary" onClick={closeImport}>Cancel</button>
        }
      >
        {importStep === 'select' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20">
              <input type="checkbox" id="roll-only" checked={importRollOnly} onChange={(e) => setImportRollOnly(e.target.checked)} className="w-4 h-4 rounded" />
              <label htmlFor="roll-only" className="text-sm text-gray-700 dark:text-gray-300">Import roll numbers only (format: student_id, name, roll_number)</label>
            </div>
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Select a CSV file to import</p>
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFileSelect} className="hidden" id="csv-upload" />
              <label htmlFor="csv-upload" className="btn-secondary cursor-pointer inline-flex">Choose File</label>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <FileSpreadsheet className="w-4 h-4" />
              <button onClick={handleTemplate} className="text-primary-600 dark:text-primary-400 hover:underline">Download blank template</button>
            </div>
          </div>
        )}
        {importStep === 'preview' && (
          <div className="space-y-4">
            {importRollOnly && rollPreview ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="To Update" value={rollPreview.toUpdate.length} color="primary" />
                  <Stat label="Unchanged" value={rollPreview.unchanged.length} color="secondary" />
                  <Stat label="Invalid" value={rollPreview.invalid.length} color="error" />
                </div>
                {rollPreview.toUpdate.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Updates</h4>
                    <div className="max-h-40 overflow-y-auto card p-2">
                      {rollPreview.toUpdate.map((u, i) => (
                        <div key={i} className="text-sm py-1 px-2 flex justify-between">
                          <span>{u.name}</span>
                          <span className="text-primary-600 dark:text-primary-400">→ Roll {u.roll_number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {rollPreview.invalid.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-error-600">Invalid Rows ({rollPreview.invalid.length})</h4>
                    <div className="max-h-32 overflow-y-auto card p-2">
                      {rollPreview.invalid.map((r, i) => (
                        <div key={i} className="text-xs py-1 px-2 text-error-600 dark:text-error-400">{r.reason}</div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : importPreview ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat label="New" value={importPreview.toCreate.length} color="success" />
                  <Stat label="Updated" value={importPreview.toUpdate.length} color="primary" />
                  <Stat label="Unchanged" value={importPreview.unchanged.length} color="secondary" />
                  <Stat label="Invalid" value={importPreview.invalid.length + importPreview.duplicates.length} color="error" />
                </div>
                {importPreview.toCreate.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">New Students ({importPreview.toCreate.length})</h4>
                    <div className="max-h-32 overflow-y-auto card p-2">
                      {importPreview.toCreate.map((c, i) => (
                        <div key={i} className="text-sm py-1 px-2">{c.roll_number} — {c.name}</div>
                      ))}
                    </div>
                  </div>
                )}
                {importPreview.toUpdate.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Updates ({importPreview.toUpdate.length})</h4>
                    <div className="max-h-32 overflow-y-auto card p-2">
                      {importPreview.toUpdate.map((u, i) => (
                        <div key={i} className="text-sm py-1 px-2">{u.roll_number} — {u.name}</div>
                      ))}
                    </div>
                  </div>
                )}
                {(importPreview.invalid.length > 0 || importPreview.duplicates.length > 0) && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-error-600">Invalid / Duplicate Rows</h4>
                    <div className="max-h-32 overflow-y-auto card p-2">
                      {[...importPreview.invalid, ...importPreview.duplicates].map((r, i) => (
                        <div key={i} className="text-xs py-1 px-2 text-error-600 dark:text-error-400">{r.reason}</div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Student" message={`Delete "${deleteTarget?.name}"? All marks, assignment statuses, and grace marks for this student will also be removed.`}
        confirmLabel="Delete" danger strong
      />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300',
    success: 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300',
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
