import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Download, Calculator, ChevronUp, ChevronDown } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ClassRoom, Exam, Student, ExamMark, UserSettings } from '@/types';
import { calcCombinedPercentage, formatPercent, formatNumber } from '@/utils/calculations';
import { downloadFile, toCsv } from '@/utils/csv';

type SortKey = 'rollNumber' | 'name' | 'total' | 'percentage';
type SortDir = 'asc' | 'desc';

export function CombinedAnalysis() {
  const { repo } = useApp();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedExams, setSelectedExams] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rollNumber');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    (async () => {
      if (!repo) return;
      try {
        const [cls, exs, setts] = await Promise.all([repo.getClasses(), repo.getExams(), repo.getSettings()]);
        setClasses(cls);
        setExams(exs);
        setSettings(setts);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [repo]);

  useEffect(() => {
    (async () => {
      if (!repo || !selectedClass || selectedClass === 'all') { setStudents([]); setMarks([]); return; }
      try {
        const [sts, mks] = await Promise.all([repo.getStudents(selectedClass), repo.getAllMarksForClass(selectedClass)]);
        setStudents(sts.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })));
        setMarks(mks);
      } catch { /* ignore */ }
    })();
  }, [repo, selectedClass]);

  const classExams = exams.filter((e) => e.classId === selectedClass && e.type === 'regular');

  const toggleExam = (examId: string) => {
    setSelectedExams((prev) => {
      const n = new Set(prev);
      if (n.has(examId)) n.delete(examId); else n.add(examId);
      return n;
    });
  };

  const results = useMemo(() => {
    const selectedExamList = classExams.filter((e) => selectedExams.has(e.id));
    return students.map((s) => {
      const entries = selectedExamList.map((ex) => {
        const mark = marks.find((m) => m.examId === ex.id && m.studentId === s.id);
        return { obtained: mark?.marks ?? null, maxMarks: ex.maxMarks };
      });
      const combined = calcCombinedPercentage(entries);
      return {
        student: s,
        combinedObtained: combined.combinedObtained,
        combinedMax: combined.combinedMax,
        combinedPercentage: combined.combinedPercentage,
      };
    });
  }, [students, classExams, selectedExams, marks]);

  const sortedFiltered = [...results]
    .filter((r) => {
      const q = search.toLowerCase();
      return r.student.name.toLowerCase().includes(q) || r.student.rollNumber.includes(q);
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'rollNumber') cmp = a.student.rollNumber.localeCompare(b.student.rollNumber, undefined, { numeric: true });
      else if (sortKey === 'name') cmp = a.student.name.localeCompare(b.student.name);
      else if (sortKey === 'total') cmp = a.combinedObtained - b.combinedObtained;
      else if (sortKey === 'percentage') cmp = (a.combinedPercentage ?? -1) - (b.combinedPercentage ?? -1);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleExport = () => {
    if (sortedFiltered.length === 0) { toast('Nothing to export', 'info'); return; }
    const rows = sortedFiltered.map((r) => ({
      roll_number: r.student.rollNumber,
      name: r.student.name,
      combined_obtained: r.combinedObtained,
      combined_max: r.combinedMax,
      combined_percentage: r.combinedPercentage !== null ? formatNumber(r.combinedPercentage, 2) : '',
    }));
    downloadFile(toCsv(rows), 'combined_results.csv');
    toast('Exported CSV', 'success');
  };

  if (loading) return <div className="space-y-4"><div className="skeleton h-8 w-48" /><div className="skeleton h-64" /></div>;

  if (classes.length === 0) {
    return <EmptyState title="No classes available" description="Create a class first." action={<Link to="/classes" className="btn-primary">Go to Classes</Link>} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Combined Analysis</h1>
        {selectedExams.size > 0 && students.length > 0 && (
          <button onClick={handleExport} className="btn-secondary"><Download className="w-4 h-4" /> Export</button>
        )}
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Select Class</label>
          <select className="input" value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setSelectedExams(new Set()); }}>
            <option value="all">Choose a class...</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.division} ({c.academicYear})</option>)}
          </select>
        </div>

        {selectedClass !== 'all' && (
          <div>
            <label className="label">Select Exams ({selectedExams.size} selected)</label>
            {classExams.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No regular exams in this class.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {classExams.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => toggleExam(ex.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      selectedExams.has(ex.id)
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-700'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedExams.has(ex.id) ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-gray-600'}`}>
                      {selectedExams.has(ex.id) && <span className="text-white text-xs">✓</span>}
                    </span>
                    {ex.name}
                    <span className="text-xs text-gray-400 ml-auto">/{ex.maxMarks}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedClass !== 'all' && selectedExams.size > 0 && students.length > 0 && (
        <>
          {search && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input pl-10" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => toggleSort('rollNumber')}>
                      <span className="flex items-center gap-1">Roll No {sortKey === 'rollNumber' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => toggleSort('name')}>
                      <span className="flex items-center gap-1">Student {sortKey === 'name' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => toggleSort('total')}>
                      <span className="flex items-center gap-1">Obtained {sortKey === 'total' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => toggleSort('percentage')}>
                      <span className="flex items-center gap-1">% {sortKey === 'percentage' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFiltered.map((r) => (
                    <tr key={r.student.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">{r.student.rollNumber}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{r.student.name}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{formatNumber(r.combinedObtained, settings?.decimalPlaces ?? 2)}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{r.combinedMax}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {r.combinedPercentage !== null ? formatPercent(r.combinedPercentage, settings?.decimalPlaces ?? 2) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedClass !== 'all' && selectedExams.size === 0 && classExams.length > 0 && (
        <EmptyState icon={<Calculator className="w-8 h-8" />} title="Select exams to combine" description="Choose two or more exams above to calculate combined results." />
      )}
    </div>
  );
}
