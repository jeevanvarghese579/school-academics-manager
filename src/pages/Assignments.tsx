import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Pencil, Trash2, ArrowLeft, ClipboardList, Calendar, MoreVertical,
  CheckSquare, Square, CheckCheck, X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ClassRoom, Assignment, Student, AssignmentStatus } from '@/types';

export function Assignments() {
  const { repo } = useApp();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', classId: '', subject: '', dueDate: '', description: '' });

  const load = async () => {
    if (!repo) return;
    try {
      const [cls, asg] = await Promise.all([repo.getClasses(), repo.getAssignments()]);
      setClasses(cls);
      setAssignments(asg);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [repo]);

  const handleSave = async () => {
    if (!repo) return;
    if (!formData.title.trim()) { toast('Title is required', 'error'); return; }
    if (!formData.classId) { toast('Please select a class', 'error'); return; }
    try {
      if (editing) {
        await repo.updateAssignment({ ...editing, ...formData });
        toast('Assignment updated', 'success');
      } else {
        await repo.createAssignment(formData);
        toast('Assignment created', 'success');
      }
      setModalOpen(false);
      setEditing(null);
      setFormData({ title: '', classId: '', subject: '', dueDate: '', description: '' });
      await load();
    } catch (err: any) { toast(err.message || 'Failed to save', 'error'); }
  };

  const handleDelete = async () => {
    if (!repo || !deleteTarget) return;
    try { await repo.deleteAssignment(deleteTarget.id); toast('Assignment deleted', 'success'); await load(); }
    catch (err: any) { toast(err.message || 'Failed to delete', 'error'); }
  };

  const openEdit = (a: Assignment) => {
    setEditing(a);
    setFormData({ title: a.title, classId: a.classId, subject: a.subject || '', dueDate: a.dueDate, description: a.description || '' });
    setModalOpen(true); setMenuOpen(null);
  };

  const openCreate = () => {
    setEditing(null);
    setFormData({ title: '', classId: classes[0]?.id || '', subject: '', dueDate: '', description: '' });
    setModalOpen(true);
  };

  const filtered = assignments.filter((a) => {
    if (filterClass !== 'all' && a.classId !== filterClass) return false;
    const q = search.toLowerCase();
    return a.title.toLowerCase().includes(q) || (a.subject || '').toLowerCase().includes(q);
  });

  if (loading) return <div className="space-y-4"><div className="skeleton h-8 w-40" /><div className="skeleton h-64" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assignments</h1>
        <button onClick={openCreate} className="btn-primary" disabled={classes.length === 0}><Plus className="w-4 h-4" /> Add Assignment</button>
      </div>

      {classes.length === 0 ? (
        <EmptyState icon={<ClipboardList className="w-8 h-8" />} title="No classes available" description="Create a class first." action={<Link to="/classes" className="btn-primary">Go to Classes</Link>} />
      ) : assignments.length === 0 ? (
        <EmptyState icon={<ClipboardList className="w-8 h-8" />} title="No assignments yet" description="Create an assignment to track submissions." action={<button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" />Add Assignment</button>} />
      ) : (
        <>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input pl-10" placeholder="Search assignments..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input w-auto" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="all">All Classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.division}</option>)}
            </select>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a) => {
              const cls = classes.find((c) => c.id === a.classId);
              return (
                <div key={a.id} className="card card-hover p-5 group">
                  <div className="flex items-start justify-between">
                    <Link to={`/assignments/${a.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                          <ClipboardList className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{a.title}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{cls?.name} {cls?.division}</p>
                        </div>
                      </div>
                      {a.subject && <span className="chip bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 mb-2">{a.subject}</span>}
                      {a.dueDate && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1"><Calendar className="w-3 h-3" />Due: {a.dueDate}</p>
                      )}
                    </Link>
                    <div className="relative">
                      <button onClick={() => setMenuOpen(menuOpen === a.id ? null : a.id)} className="btn-icon -mr-2 -mt-1" aria-label="Menu"><MoreVertical className="w-4 h-4" /></button>
                      {menuOpen === a.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 top-10 z-20 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-e3 border border-gray-100 dark:border-gray-700 py-1 animate-scale-in">
                            <button onClick={() => openEdit(a)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Pencil className="w-4 h-4" /> Edit</button>
                            <button onClick={() => { setDeleteTarget(a); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20"><Trash2 className="w-4 h-4" /> Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Assignment' : 'Add Assignment'}
        footer={<><button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>{editing ? 'Save' : 'Create'}</button></>}
      >
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="asg-title">Title</label>
            <input id="asg-title" className="input" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Chapter 5 Problems" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="asg-class">Class</label>
              <select id="asg-class" className="input" value={formData.classId} onChange={(e) => setFormData({ ...formData, classId: e.target.value })}>
                <option value="">Select class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.division}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="asg-subject">Subject (optional)</label>
              <input id="asg-subject" className="input" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="asg-due">Due Date</label>
            <input id="asg-due" type="date" className="input" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="asg-desc">Description (optional)</label>
            <textarea id="asg-desc" className="input min-h-16" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Assignment" message={`Delete "${deleteTarget?.title}"? All submission records will also be deleted.`}
        confirmLabel="Delete" danger strong
      />
    </div>
  );
}

export function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { repo } = useApp();
  const { toast } = useToast();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [statuses, setStatuses] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!repo || !id) return;
    try {
      const asg = await repo.getAssignment(id);
      setAssignment(asg);
      if (asg) {
        const [sts, stss] = await Promise.all([repo.getStudents(asg.classId), repo.getAssignmentStatuses(id)]);
        setStudents(sts.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })));
        const m = new Map<string, boolean>();
        for (const s of stss) m.set(s.studentId, s.submitted);
        setStatuses(m);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [repo, id]);

  const toggleStatus = async (studentId: string) => {
    if (!repo || !assignment || !id) return;
    const current = statuses.get(studentId) ?? false;
    const newVal = !current;
    setStatuses((prev) => { const n = new Map(prev); n.set(studentId, newVal); return n; });
    try {
      await repo.saveAssignmentStatus({ assignmentId: id, studentId, classId: assignment.classId, submitted: newVal });
    } catch (err: any) { toast(err.message || 'Failed to update', 'error'); }
  };

  const markAll = async (submitted: boolean) => {
    if (!repo || !assignment || !id) return;
    const targets = selected.size > 0 ? students.filter((s) => selected.has(s.id)) : students;
    setStatuses((prev) => {
      const n = new Map(prev);
      for (const s of targets) n.set(s.id, submitted);
      return n;
    });
    try {
      await repo.bulkSaveAssignmentStatuses(targets.map((s) => ({ assignmentId: id, studentId: s.id, classId: assignment.classId, submitted })));
      toast(`${targets.length} students ${submitted ? 'marked submitted' : 'unmarked'}`, 'success');
    } catch (err: any) { toast(err.message || 'Failed', 'error'); }
  };

  const toggleSelect = (sid: string) => {
    setSelected((prev) => { const n = new Set(prev); if (n.has(sid)) n.delete(sid); else n.add(sid); return n; });
  };

  if (loading) return <div className="space-y-4"><div className="skeleton h-8 w-64" /><div className="skeleton h-64" /></div>;
  if (!assignment) return <EmptyState title="Assignment not found" description="This assignment may have been deleted." action={<Link to="/assignments" className="btn-primary">Back</Link>} />;

  const submittedCount = Array.from(statuses.values()).filter(Boolean).length;
  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.rollNumber.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/assignments')} className="btn-icon" aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{assignment.title}</h1>
          {assignment.dueDate && <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Due: {assignment.dueDate}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="card px-4 py-2 flex items-center gap-2">
          <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">{submittedCount}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">/ {students.length} submitted</span>
        </div>
        <button onClick={() => markAll(true)} className="btn-secondary"><CheckCheck className="w-4 h-4" /> {selected.size > 0 ? `Mark Selected Submitted` : 'Mark All Submitted'}</button>
        <button onClick={() => markAll(false)} className="btn-secondary"><X className="w-4 h-4" /> {selected.size > 0 ? `Unmark Selected` : 'Unmark All'}</button>
      </div>

      {students.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-10" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      {students.length === 0 ? (
        <EmptyState title="No students" description="No students in this class." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">
                    <button onClick={() => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((s) => s.id)))} className="btn-icon w-8 h-8">
                      {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare className="w-4 h-4 text-primary-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">Roll No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const submitted = statuses.get(s.id) ?? false;
                  return (
                    <tr key={s.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelect(s.id)} className="btn-icon w-8 h-8">
                          {selected.has(s.id) ? <CheckSquare className="w-4 h-4 text-primary-600" /> : <Square className="w-4 h-4 text-gray-300 dark:text-gray-600" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{s.rollNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{s.name}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleStatus(s.id)}
                          className={`chip transition-all ${submitted ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
                        >
                          {submitted ? <><CheckSquare className="w-3.5 h-3.5" /> Submitted</> : <><Square className="w-3.5 h-3.5" /> Not Submitted</>}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
