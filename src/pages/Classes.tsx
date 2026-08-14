import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Copy, Users, GraduationCap, MoreVertical, ArrowLeft } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ClassRoom, Student } from '@/types';

export function Classes() {
  const { repo } = useApp();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRoom | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassRoom | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', division: '', academicYear: '', description: '' });

  const load = async () => {
    if (!repo) return;
    try {
      const [cls, students] = await Promise.all([repo.getClasses(), repo.getStudents()]);
      setClasses(cls);
      const counts: Record<string, number> = {};
      for (const c of cls) counts[c.id] = students.filter((s) => s.classId === c.id).length;
      setStudentCounts(counts);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [repo]);

  const handleSave = async () => {
    if (!repo) return;
    if (!formData.name.trim()) {
      toast('Class name is required', 'error');
      return;
    }
    try {
      if (editing) {
        await repo.updateClass({ ...editing, ...formData });
        toast('Class updated', 'success');
      } else {
        await repo.createClass(formData);
        toast('Class created', 'success');
      }
      setModalOpen(false);
      setEditing(null);
      setFormData({ name: '', division: '', academicYear: '', description: '' });
      await load();
    } catch (err: any) {
      toast(err.message || 'Failed to save', 'error');
    }
  };

  const handleDuplicate = async (cls: ClassRoom) => {
    if (!repo) return;
    try {
      await repo.createClass({
        name: `${cls.name} (Copy)`,
        division: cls.division,
        academicYear: cls.academicYear,
        description: cls.description,
      });
      toast('Class duplicated', 'success');
      setMenuOpen(null);
      await load();
    } catch (err: any) {
      toast(err.message || 'Failed to duplicate', 'error');
    }
  };

  const handleDelete = async () => {
    if (!repo || !deleteTarget) return;
    try {
      await repo.deleteClass(deleteTarget.id);
      toast('Class deleted', 'success');
      await load();
    } catch (err: any) {
      toast(err.message || 'Failed to delete', 'error');
    }
  };

  const openEdit = (cls: ClassRoom) => {
    setEditing(cls);
    setFormData({
      name: cls.name,
      division: cls.division,
      academicYear: cls.academicYear,
      description: cls.description || '',
    });
    setModalOpen(true);
    setMenuOpen(null);
  };

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: '', division: '', academicYear: '', description: '' });
    setModalOpen(true);
  };

  const filtered = classes.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.division.toLowerCase().includes(q) || c.academicYear.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-40" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-36" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Classes</h1>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Class
        </button>
      </div>

      {classes.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-10"
            placeholder="Search classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {filtered.length === 0 && classes.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-8 h-8" />}
          title="No classes yet"
          description="Create a class to start adding students, exams, and assignments."
          action={<button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" />Add Class</button>}
        />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No classes match your search.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cls) => (
            <div key={cls.id} className="card card-hover p-5 group">
              <div className="flex items-start justify-between">
                <Link to={`/classes/${cls.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{cls.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{cls.academicYear}</p>
                    </div>
                  </div>
                  {cls.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-2">{cls.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="chip bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300">
                      Div {cls.division || '—'}
                    </span>
                    <span className="chip bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      <Users className="w-3 h-3" />
                      {studentCounts[cls.id] || 0} students
                    </span>
                  </div>
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === cls.id ? null : cls.id)}
                    className="btn-icon -mr-2 -mt-1"
                    aria-label="Class menu"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuOpen === cls.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-0 top-10 z-20 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-e3 border border-gray-100 dark:border-gray-700 py-1 animate-scale-in">
                        <button
                          onClick={() => openEdit(cls)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <Pencil className="w-4 h-4" /> Edit
                        </button>
                        <button
                          onClick={() => handleDuplicate(cls)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <Copy className="w-4 h-4" /> Duplicate
                        </button>
                        <button
                          onClick={() => { setDeleteTarget(cls); setMenuOpen(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Class' : 'Add Class'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>{editing ? 'Save' : 'Create'}</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="cls-name">Class Name</label>
            <input id="cls-name" className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Plus Two" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="cls-div">Division</label>
              <input id="cls-div" className="input" value={formData.division} onChange={(e) => setFormData({ ...formData, division: e.target.value })} placeholder="e.g. A" />
            </div>
            <div>
              <label className="label" htmlFor="cls-year">Academic Year</label>
              <input id="cls-year" className="input" value={formData.academicYear} onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })} placeholder="e.g. 2026–27" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="cls-desc">Description (optional)</label>
            <textarea id="cls-desc" className="input min-h-20" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional notes about this class" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Class"
        message={`Delete "${deleteTarget?.name}" and all its students, exams, marks, assignments, and grace marks?`}
        confirmLabel="Delete"
        danger
        strong
      />
    </div>
  );
}
