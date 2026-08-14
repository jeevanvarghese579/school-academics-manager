import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Users, ClipboardCheck, ClipboardList, Calendar, TrendingUp, Award } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { ClassRoom, Exam, Assignment, Student } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';

interface DashboardData {
  classes: ClassRoom[];
  students: Student[];
  exams: Exam[];
  assignments: Assignment[];
}

export function Dashboard() {
  const { repo } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!repo) return;
      try {
        const [classes, students, exams, assignments] = await Promise.all([
          repo.getClasses(),
          repo.getStudents(),
          repo.getExams(),
          repo.getAssignments(),
        ]);
        setData({ classes, students, exams, assignments });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [repo]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.classes.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>
        <EmptyState
          icon={<GraduationCap className="w-8 h-8" />}
          title="No classes yet"
          description="Create your first class to start managing students, exams, and reports."
          action={
            <Link to="/classes" className="btn-primary">
              <GraduationCap className="w-4 h-4" />
              Create Class
            </Link>
          }
        />
      </div>
    );
  }

  const pendingAssignments = data.assignments.filter((a) => {
    const due = new Date(a.dueDate || '');
    return due >= new Date(Date.now() - 86400000);
  });

  const recentExams = [...data.exams]
    .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
    .slice(0, 5);

  const recentClasses = [...data.classes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const stats = [
    { label: 'Classes', value: data.classes.length, icon: GraduationCap, color: 'primary', to: '/classes' },
    { label: 'Students', value: data.students.length, icon: Users, color: 'secondary', to: '/students' },
    { label: 'Exams', value: data.exams.length, icon: ClipboardCheck, color: 'accent', to: '/exams' },
    { label: 'Assignments', value: data.assignments.length, icon: ClipboardList, color: 'success', to: '/assignments' },
  ];

  const colorMap: Record<string, string> = {
    primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400',
    secondary: 'bg-secondary-50 dark:bg-secondary-900/20 text-secondary-600 dark:text-secondary-400',
    accent: 'bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400',
    success: 'bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              to={stat.to}
              className="card card-hover p-5 flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[stat.color]}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent exams */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Exams</h2>
          </div>
          {recentExams.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No exams created yet.</p>
          ) : (
            <div className="space-y-2">
              {recentExams.map((exam) => {
                const cls = data.classes.find((c) => c.id === exam.classId);
                return (
                  <Link
                    key={exam.id}
                    to={`/exams/${exam.id}`}
                    className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{exam.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{cls?.name} {cls?.division}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {exam.date || '—'}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recently edited classes */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Recently Edited Classes</h2>
          </div>
          {recentClasses.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No classes yet.</p>
          ) : (
            <div className="space-y-2">
              {recentClasses.map((cls) => {
                const studentCount = data.students.filter((s) => s.classId === cls.id).length;
                return (
                  <Link
                    key={cls.id}
                    to={`/classes/${cls.id}`}
                    className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {cls.name} {cls.division}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{cls.academicYear}</p>
                    </div>
                    <span className="chip bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      <Users className="w-3 h-3" />
                      {studentCount}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pending assignments */}
      {pendingAssignments.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-accent-600 dark:text-accent-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Active Assignments</h2>
          </div>
          <div className="space-y-2">
            {pendingAssignments.map((a) => {
              const cls = data.classes.find((c) => c.id === a.classId);
              return (
                <Link
                  key={a.id}
                  to={`/assignments/${a.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{a.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{cls?.name} {cls?.division}</p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{a.dueDate || 'No due date'}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
