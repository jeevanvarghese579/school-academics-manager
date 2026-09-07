import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Award, MoreVertical } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ClassRoom, Student, GraceMark, GraceCategory } from '@/types';

const CATEGORIES: GraceCategory[] = ['Sports', 'Arts', 'NCC', 'NSS', 'Other'];

export function GraceMarks() {
  const { repo } = useApp();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [graceMarks, setGraceMarks] = useState<GraceMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GraceMark | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<GraceMark | null>(null);
  const [menuOpen, setMenuOpen] = useState<{ id: string; top: number; right: number } | null>(null);
  const [formData, setFormData] = useState({
    title: '', description: '', category: 'Other' as string, date: '', studentId: '', classId: '', marks: '',
  });

  const load = async () => {
    if (!repo) return;
    try {
      const [cls, sts, gm] = await Promise.all([repo.getClasses(), repo.getStudents(), repo.getGraceMarks()]);
      setClasses(cls);
      setStudents(sts);
      setGraceMarks(gm);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [repo]);

  const handleSave = async () => {
    if (!repo) return;
    if (!formData.title.trim()) { toast('Title is required', 'error'); return; }
    if (!formData.classId) { toast('Please select a class', 'error'); return; }
    if (editing && !formData.studentId) { toast('Please select a student', 'error'); return; }
    if (!editing && selectedStudentIds.size === 0) { toast('Please select at least one student', 'error'); return; }
    const marks = parseFloat(formData.marks);
    if (isNaN(marks) || marks < 0) { toast('Grace marks must be a non-negative number', 'error'); return; }
    try {
      if (editing) {
        await repo.updateGraceMark({ ...editing, ...formData, marks });
        toast('Grace mark updated', 'success');
      } else {
        await Promise.all(
          [...selectedStudentIds].map((studentId) =>
            repo.createGraceMark({ ...formData, studentId, marks }),
          ),
        );
        toast(`Grace mark added to ${selectedStudentIds.size} student${selectedStudentIds.size === 1 ? '' : 's'}`, 'success');
      }
      setModalOpen(false);
      setEditing(null);
      setSelectedStudentIds(new Set());
      setFormData({ title: '', description: '', category: 'Other', date: '', studentId: '', classId: '', marks: '' });
      await load();
    } catch (err: any) { toast(err.message || 'Failed to save', 'error'); }
  };

  const handleDelete = async () => {
    if (!repo || !deleteTarget) return;
    try {
      await repo.deleteGraceMark(deleteTarget.id);
      toast('Grace mark deleted', 'success', { label: 'Undo', onClick: async () => {
        await repo.createGraceMark({ title: deleteTarget.title, description: deleteTarget.description, category: deleteTarget.category, date: deleteTarget.date, studentId: deleteTarget.studentId, classId: deleteTarget.classId, marks: deleteTarget.marks, notes: deleteTarget.notes });
        await load();
      }});
      await load();
    } catch (err: any) { toast(err.message || 'Failed to delete', 'error'); }
  };

  const openEdit = (g: GraceMark) => {
    setEditing(g);
    setSelectedStudentIds(new Set([g.studentId]));
    setFormData({ title: g.title, description: g.description || '', category: g.category, date: g.date, studentId: g.studentId, classId: g.classId, marks: String(g.marks) });
    setModalOpen(true); setMenuOpen(null);
  };

  const openCreate = () => {
    setEditing(null);
    setSelectedStudentIds(new Set());
    setFormData({ title: '', description: '', category: 'Other', date: new Date().toISOString().slice(0, 10), studentId: '', classId: classes[0]?.id || '', marks: '' });
    setModalOpen(true);
  };

  const classStudents = students
    .filter((student) => student.classId === formData.classId)
    .sort((a, b) =>
      a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }),
    );
  const toggleStudent = (studentId: string) =>
    setSelectedStudentIds((current) => {
      const next = new Set(current);
      next.has(studentId) ? next.delete(studentId) : next.add(studentId);
      return next;
    });

  const filtered = graceMarks.filter((g) => {
    if (filterClass !== 'all' && g.classId !== filterClass) return false;
    if (filterCategory !== 'all' && g.category !== filterCategory) return false;
    const q = search.toLowerCase();
    const student = students.find((s) => s.id === g.studentId);
    return g.title.toLowerCase().includes(q) || (student?.name || '').toLowerCase().includes(q) || g.category.toLowerCase().includes(q);
  });

  // Total grace marks per student
  const totalsByStudent = new Map<string, number>();
  for (const g of graceMarks) {
    totalsByStudent.set(g.studentId, (totalsByStudent.get(g.studentId) || 0) + g.marks);
  }

  if (loading) return <div className="space-y-4"><div className="skeleton h-8 w-40" /><div className="skeleton h-64" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Grace Marks</h1>
        <button onClick={openCreate} className="btn-primary" disabled={classes.length === 0}><Plus className="w-4 h-4" /> Add Grace Mark</button>
      </div>

      {classes.length === 0 ? (
        <EmptyState icon={<Award className="w-8 h-8" />} title="No classes available" description="Create a class first." action={<Link to="/classes" className="btn-primary">Go to Classes</Link>} />
      ) : graceMarks.length === 0 ? (
        <EmptyState icon={<Award className="w-8 h-8" />} title="No grace marks yet" description="Add grace marks for extracurricular achievements." action={<button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" />Add Grace Mark</button>} />
      ) : (
        <>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input pl-10" placeholder="Search by title or student..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input w-auto" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="all">All Classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.division}</option>)}
            </select>
            <select className="input w-auto" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marks</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((g) => {
                    const student = students.find((s) => s.id === g.studentId);
                    const cls = classes.find((c) => c.id === g.classId);
                    return (
                      <tr key={g.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{g.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hidden md:table-cell">
                          {student?.name || '—'} <span className="text-xs text-gray-400">({cls?.name})</span>
                        </td>
                        <td className="px-4 py-3"><span className="chip bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300">{g.category}</span></td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">{g.date || '—'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-success-600 dark:text-success-400">+{g.marks}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="relative">
                            <button onClick={(event) => {
                              if (menuOpen?.id === g.id) return setMenuOpen(null);
                              const rect = event.currentTarget.getBoundingClientRect();
                              setMenuOpen({
                                id: g.id,
                                top: Math.min(rect.bottom + 4, window.innerHeight - 92),
                                right: Math.max(8, window.innerWidth - rect.right),
                              });
                            }} className="btn-icon w-8 h-8" aria-label="Menu"><MoreVertical className="w-4 h-4" /></button>
                            {menuOpen?.id === g.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                                <div className="fixed z-50 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-e3 border border-gray-100 dark:border-gray-700 py-1 animate-scale-in" style={{ top: menuOpen.top, right: menuOpen.right }}>
                                  <button onClick={() => openEdit(g)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Pencil className="w-4 h-4" /> Edit</button>
                                  <button onClick={() => { setDeleteTarget(g); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20"><Trash2 className="w-4 h-4" /> Delete</button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Grace Mark' : 'Add Grace Mark'}
        footer={<><button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>{editing ? 'Save' : `Add to ${selectedStudentIds.size} student${selectedStudentIds.size === 1 ? '' : 's'}`}</button></>}
      >
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="gm-title">Title</label>
            <input id="gm-title" className="input" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. State Sports" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={editing ? '' : 'col-span-2'}>
              <label className="label" htmlFor="gm-class">Class</label>
              <select id="gm-class" className="input" value={formData.classId} onChange={(e) => { setFormData({ ...formData, classId: e.target.value, studentId: '' }); setSelectedStudentIds(new Set()); }}>
                <option value="">Select class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.division}</option>)}
              </select>
            </div>
            {editing && <div>
              <label className="label" htmlFor="gm-student">Student</label>
              <select id="gm-student" className="input" value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}>
                <option value="">Select student</option>
                {classStudents.map((s) => <option key={s.id} value={s.id}>{s.rollNumber} — {s.name}</option>)}
              </select>
            </div>}
          </div>
          {!editing && (
            <fieldset>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="label mb-0">Students</span>
                <div className="flex gap-2">
                  <button type="button" className="text-xs text-primary-700 hover:underline" onClick={() => setSelectedStudentIds(new Set(classStudents.map((student) => student.id)))}>Select all</button>
                  <button type="button" className="text-xs text-gray-600 hover:underline" onClick={() => setSelectedStudentIds(new Set())}>Clear</button>
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 p-2 space-y-1">
                {classStudents.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-gray-500">No students in this class.</p>
                ) : classStudents.map((student) => (
                  <label key={student.id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <input type="checkbox" checked={selectedStudentIds.has(student.id)} onChange={() => toggleStudent(student.id)} />
                    <span>{student.rollNumber} — {student.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="gm-cat">Category</label>
              <select id="gm-cat" className="input" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="gm-marks">Grace Marks</label>
              <input id="gm-marks" type="number" className="input" value={formData.marks} onChange={(e) => setFormData({ ...formData, marks: e.target.value })} min="0" step="0.5" placeholder="e.g. 5" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="gm-date">Date</label>
            <input id="gm-date" type="date" className="input" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="gm-desc">Description (optional)</label>
            <textarea id="gm-desc" className="input min-h-16" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Grace Mark" message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete" danger
      />
    </div>
  );
}
