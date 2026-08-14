import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, ClipboardCheck, Calendar, MoreVertical, Award } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ClassRoom, Exam, ExamType } from '@/types';

export function Exams() {
  const { repo } = useApp();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', classId: '', subject: '', date: '', maxMarks: '100', notes: '', type: 'regular' as ExamType,
  });

  const load = async () => {
    if (!repo) return;
    try {
      const [cls, exs] = await Promise.all([repo.getClasses(), repo.getExams()]);
      setClasses(cls);
      setExams(exs);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [repo]);

  const handleSave = async () => {
    if (!repo) return;
    if (!formData.name.trim()) { toast('Exam name is required', 'error'); return; }
    if (!formData.classId) { toast('Please select a class', 'error'); return; }
    const maxMarks = parseFloat(formData.maxMarks);
    if (isNaN(maxMarks) || maxMarks <= 0) { toast('Maximum marks must be greater than zero', 'error'); return; }
    try {
      if (editing) {
        await repo.updateExam({ ...editing, name: formData.name, classId: formData.classId, subject: formData.subject || undefined, date: formData.date, maxMarks, notes: formData.notes || undefined, type: formData.type });
        toast('Exam updated', 'success');
      } else {
        await repo.createExam({ name: formData.name, classId: formData.classId, subject: formData.subject || undefined, date: formData.date, maxMarks, notes: formData.notes || undefined, type: formData.type });
        toast('Exam created', 'success');
      }
      setModalOpen(false);
      setEditing(null);
      setFormData({ name: '', classId: '', subject: '', date: '', maxMarks: '100', notes: '', type: 'regular' });
      await load();
    } catch (err: any) { toast(err.message || 'Failed to save', 'error'); }
  };

  const handleDelete = async () => {
    if (!repo || !deleteTarget) return;
    try { await repo.deleteExam(deleteTarget.id); toast('Exam deleted', 'success'); await load(); }
    catch (err: any) { toast(err.message || 'Failed to delete', 'error'); }
  };

  const openEdit = (ex: Exam) => {
    setEditing(ex);
    setFormData({ name: ex.name, classId: ex.classId, subject: ex.subject || '', date: ex.date, maxMarks: String(ex.maxMarks), notes: ex.notes || '', type: ex.type });
    setModalOpen(true); setMenuOpen(null);
  };

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: '', classId: classes[0]?.id || '', subject: '', date: new Date().toISOString().slice(0, 10), maxMarks: '100', notes: '', type: 'regular' });
    setModalOpen(true);
  };

  const filtered = exams.filter((e) => {
    if (filterClass !== 'all' && e.classId !== filterClass) return false;
    const q = search.toLowerCase();
    return e.name.toLowerCase().includes(q) || (e.subject || '').toLowerCase().includes(q);
  });

  if (loading) return <div className="space-y-4"><div className="skeleton h-8 w-32" /><div className="skeleton h-64" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exams</h1>
        <button onClick={openCreate} className="btn-primary" disabled={classes.length === 0}>
          <Plus className="w-4 h-4" /> Add Exam
        </button>
      </div>

      {classes.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="w-8 h-8" />} title="No classes available" description="Create a class first before adding exams." action={<Link to="/classes" className="btn-primary">Go to Classes</Link>} />
      ) : exams.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="w-8 h-8" />} title="No exams yet" description="Create an exam to start entering marks." action={<button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" />Add Exam</button>} />
      ) : (
        <>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input pl-10" placeholder="Search exams..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input w-auto" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="all">All Classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.division}</option>)}
            </select>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((ex) => {
              const cls = classes.find((c) => c.id === ex.classId);
              return (
                <div key={ex.id} className="card card-hover p-5 group">
                  <div className="flex items-start justify-between">
                    <Link to={`/exams/${ex.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ex.type === 'plusOne' ? 'bg-accent-100 dark:bg-accent-900/30' : 'bg-primary-100 dark:bg-primary-900/30'}`}>
                          {ex.type === 'plusOne' ? <Award className="w-5 h-5 text-accent-600 dark:text-accent-400" /> : <ClipboardCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{ex.name}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{cls?.name} {cls?.division}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {ex.subject && <span className="chip bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{ex.subject}</span>}
                        <span className="chip bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300">Max {ex.maxMarks}</span>
                        {ex.type === 'plusOne' && <span className="chip bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300">Plus One</span>}
                        {ex.date && <span className="chip bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"><Calendar className="w-3 h-3" />{ex.date}</span>}
                      </div>
                    </Link>
                    <div className="relative">
                      <button onClick={() => setMenuOpen(menuOpen === ex.id ? null : ex.id)} className="btn-icon -mr-2 -mt-1" aria-label="Menu"><MoreVertical className="w-4 h-4" /></button>
                      {menuOpen === ex.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 top-10 z-20 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-e3 border border-gray-100 dark:border-gray-700 py-1 animate-scale-in">
                            <button onClick={() => openEdit(ex)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Pencil className="w-4 h-4" /> Edit</button>
                            <button onClick={() => { setDeleteTarget(ex); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20"><Trash2 className="w-4 h-4" /> Delete</button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Exam' : 'Add Exam'}
        footer={<><button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>{editing ? 'Save' : 'Create'}</button></>}
      >
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="ex-name">Exam Name</label>
            <input id="ex-name" className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Unit Test 1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="ex-class">Class</label>
              <select id="ex-class" className="input" value={formData.classId} onChange={(e) => setFormData({ ...formData, classId: e.target.value })}>
                <option value="">Select class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.division}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ex-subject">Subject (optional)</label>
              <input id="ex-subject" className="input" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="e.g. Physics" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="ex-date">Date</label>
              <input id="ex-date" type="date" className="input" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="ex-max">Maximum Marks</label>
              <input id="ex-max" type="number" className="input" value={formData.maxMarks} onChange={(e) => setFormData({ ...formData, maxMarks: e.target.value })} min="1" />
            </div>
          </div>
          <div>
            <label className="label">Exam Type</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setFormData({ ...formData, type: 'regular' })} className={`flex-1 btn ${formData.type === 'regular' ? 'btn-primary' : 'btn-secondary'}`}>
                <ClipboardCheck className="w-4 h-4" /> Regular Exam
              </button>
              <button type="button" onClick={() => setFormData({ ...formData, type: 'plusOne', maxMarks: '100' })} className={`flex-1 btn ${formData.type === 'plusOne' ? 'btn-primary' : 'btn-secondary'}`}>
                <Award className="w-4 h-4" /> Plus One Exam
              </button>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ex-notes">Notes (optional)</label>
            <textarea id="ex-notes" className="input min-h-16" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Exam" message={`Delete "${deleteTarget?.name}"? All marks recorded for this exam will also be deleted.`}
        confirmLabel="Delete" danger strong
      />
    </div>
  );
}
