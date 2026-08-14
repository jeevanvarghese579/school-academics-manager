import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Printer, FileBarChart, Users, Award, CheckCircle2, XCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ClassRoom, Student, Exam, ExamMark, PlusOneMark, Assignment, AssignmentStatus, GraceMark, UserSettings } from '@/types';
import { calcPercentage, calcPlusOneResult, formatPercent, formatNumber, calcClassStats } from '@/utils/calculations';

type ReportType = 'student' | 'class';

export function Reports() {
  const { repo } = useApp();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<ReportType>('student');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [selectedExams, setSelectedExams] = useState<Set<string>>(new Set());
  const [examMarks, setExamMarks] = useState<ExamMark[]>([]);
  const [plusOneMarks, setPlusOneMarks] = useState<PlusOneMark[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentStatuses, setAssignmentStatuses] = useState<AssignmentStatus[]>([]);
  const [graceMarks, setGraceMarks] = useState<GraceMark[]>([]);

  useEffect(() => {
    (async () => {
      if (!repo) return;
      try {
        const [cls, sts, exs, setts] = await Promise.all([repo.getClasses(), repo.getStudents(), repo.getExams(), repo.getSettings()]);
        setClasses(cls);
        setStudents(sts);
        setExams(exs);
        setSettings(setts);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [repo]);

  useEffect(() => {
    (async () => {
      if (!repo || !selectedClass || selectedClass === 'all') return;
      try {
        const [em, pom, asg, asts, gm] = await Promise.all([
          repo.getAllMarksForClass(selectedClass),
          repo.getAllPlusOneMarksForClass(selectedClass),
          repo.getAssignments(selectedClass),
          repo.getAllAssignmentStatusesForClass(selectedClass),
          repo.getGraceMarks(selectedClass),
        ]);
        setExamMarks(em);
        setPlusOneMarks(pom);
        setAssignments(asg);
        setAssignmentStatuses(asts);
        setGraceMarks(gm);
        setSelectedStudent('all');
        setSelectedExams(new Set());
      } catch { /* ignore */ }
    })();
  }, [repo, selectedClass]);

  const classStudents = students.filter((s) => s.classId === selectedClass);
  const classExams = exams.filter((e) => e.classId === selectedClass);

  const toggleExam = (examId: string) => {
    setSelectedExams((prev) => { const n = new Set(prev); if (n.has(examId)) n.delete(examId); else n.add(examId); return n; });
  };

  const handlePrint = () => window.print();

  if (loading) return <div className="space-y-4"><div className="skeleton h-8 w-32" /><div className="skeleton h-96" /></div>;

  if (classes.length === 0) {
    return <EmptyState icon={<FileBarChart className="w-8 h-8" />} title="No data for reports" description="Create classes and add exams to generate reports." action={<Link to="/classes" className="btn-primary">Go to Classes</Link>} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        {selectedClass !== 'all' && (
          <button onClick={handlePrint} className="btn-primary"><Printer className="w-4 h-4" /> Print / Save PDF</button>
        )}
      </div>

      {/* Controls */}
      <div className="card p-5 space-y-4 no-print">
        <div className="flex gap-2">
          <button onClick={() => setReportType('student')} className={`flex-1 btn ${reportType === 'student' ? 'btn-primary' : 'btn-secondary'}`}>
            <Users className="w-4 h-4" /> Student Report
          </button>
          <button onClick={() => setReportType('class')} className={`flex-1 btn ${reportType === 'class' ? 'btn-primary' : 'btn-secondary'}`}>
            <FileBarChart className="w-4 h-4" /> Class Report
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="label">Class</label>
            <select className="input" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="all">Choose a class...</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.division} ({c.academicYear})</option>)}
            </select>
          </div>
          {reportType === 'student' && (
            <div>
              <label className="label">Student</label>
              <select className="input" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} disabled={selectedClass === 'all'}>
                <option value="all">Choose a student...</option>
                {classStudents.map((s) => <option key={s.id} value={s.id}>{s.rollNumber} — {s.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {selectedClass !== 'all' && (
          <div>
            <label className="label">Exams to Include</label>
            {classExams.length === 0 ? (
              <p className="text-sm text-gray-400">No exams in this class.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {classExams.map((ex) => (
                  <button key={ex.id} onClick={() => toggleExam(ex.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedExams.has(ex.id) ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-300' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                    }`}>
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedExams.has(ex.id) ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-gray-600'}`}>
                      {selectedExams.has(ex.id) && <span className="text-white text-xs">✓</span>}
                    </span>
                    {ex.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report content */}
      {selectedClass !== 'all' && reportType === 'student' && selectedStudent !== 'all' && (
        <StudentReport
          student={classStudents.find((s) => s.id === selectedStudent)!}
          cls={classes.find((c) => c.id === selectedClass)!}
          exams={classExams.filter((e) => selectedExams.has(e.id))}
          examMarks={examMarks}
          plusOneMarks={plusOneMarks}
          assignments={assignments}
          assignmentStatuses={assignmentStatuses}
          graceMarks={graceMarks}
          settings={settings}
        />
      )}

      {selectedClass !== 'all' && reportType === 'class' && (
        <ClassReport
          students={classStudents}
          cls={classes.find((c) => c.id === selectedClass)!}
          exams={classExams.filter((e) => selectedExams.has(e.id))}
          examMarks={examMarks}
          plusOneMarks={plusOneMarks}
          assignments={assignments}
          assignmentStatuses={assignmentStatuses}
          graceMarks={graceMarks}
          settings={settings}
        />
      )}

      {selectedClass !== 'all' && reportType === 'student' && selectedStudent === 'all' && classStudents.length > 0 && (
        <EmptyState title="Select a student" description="Choose a student to view their individual report." />
      )}
    </div>
  );
}

function StudentReport({
  student, cls, exams, examMarks, plusOneMarks, assignments, assignmentStatuses, graceMarks, settings,
}: {
  student: Student; cls: ClassRoom; exams: Exam[]; examMarks: ExamMark[]; plusOneMarks: PlusOneMark[];
  assignments: Assignment[]; assignmentStatuses: AssignmentStatus[]; graceMarks: GraceMark[]; settings: UserSettings | null;
}) {
  const dec = settings?.decimalPlaces ?? 2;
  const studentGraceMarks = graceMarks.filter((g) => g.studentId === student.id);
  const totalGrace = studentGraceMarks.reduce((sum, g) => sum + g.marks, 0);
  const studentAssignments = assignments.filter((a) => a.classId === cls.id);
  const studentStatuses = assignmentStatuses.filter((s) => s.studentId === student.id);
  const submittedCount = studentStatuses.filter((s) => s.submitted).length;

  const chartData = exams.filter((e) => e.type === 'regular').map((ex) => {
    const mark = examMarks.find((m) => m.examId === ex.id && m.studentId === student.id);
    const pct = calcPercentage(mark?.marks ?? null, ex.maxMarks);
    return { name: ex.name, percentage: pct ?? 0 };
  });

  const plusOneExams = exams.filter((e) => e.type === 'plusOne');
  const plusOneResults = plusOneExams.map((ex) => {
    const pom = plusOneMarks.find((m) => m.examId === ex.id && m.studentId === student.id);
    return { exam: ex, result: calcPlusOneResult(pom?.teMarks ?? null, pom?.ceMarks ?? null, settings || {
      plusOneMaxTE: 80, plusOneMaxCE: 20, plusOneMaxTotal: 100, requiredTEPercent: 30, requiredTotalPercent: 30, doublePassEnabled: true, aPlusThreshold: 90,
    }) };
  });

  return (
    <div className="space-y-6 print-area">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{student.name}</h2>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 space-y-0.5">
              <p>Roll No: {student.rollNumber} · Class: {cls.name} {cls.division} · {cls.academicYear}</p>
              {student.admissionNumber && <p>Admission No: {student.admissionNumber}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Report generated</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Exam performance */}
      {exams.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Exam Performance</h3>
          <div className="space-y-2">
            {exams.map((ex) => {
              if (ex.type === 'plusOne') {
                const pom = plusOneMarks.find((m) => m.examId === ex.id && m.studentId === student.id);
                const result = calcPlusOneResult(pom?.teMarks ?? null, pom?.ceMarks ?? null, settings || {
                  plusOneMaxTE: 80, plusOneMaxCE: 20, plusOneMaxTotal: 100, requiredTEPercent: 30, requiredTotalPercent: 30, doublePassEnabled: true, aPlusThreshold: 90,
                });
                return (
                  <div key={ex.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800/50">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{ex.name}</p>
                      <p className="text-xs text-gray-400">TE: {result.teMarks ?? '—'} / CE: {result.ceMarks ?? '—'} · Total: {result.total !== null ? formatNumber(result.total, dec) : '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{result.percentage !== null ? formatPercent(result.percentage, dec) : '—'}</p>
                      {result.isIncomplete ? <span className="text-xs text-gray-400">Incomplete</span> :
                       result.doublePass ? <span className="text-xs text-success-600">Double Pass</span> :
                       result.passed ? <span className="text-xs text-primary-600">Passed</span> :
                       <span className="text-xs text-error-600">Failed</span>}
                    </div>
                  </div>
                );
              }
              const mark = examMarks.find((m) => m.examId === ex.id && m.studentId === student.id);
              const pct = calcPercentage(mark?.marks ?? null, ex.maxMarks);
              return (
                <div key={ex.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800/50">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{ex.name}</p>
                  <div className="text-right">
                    <p className="text-sm">{mark?.marks ?? '—'} / {ex.maxMarks}</p>
                    <p className="text-xs text-gray-400">{pct !== null ? formatPercent(pct, dec) : '—'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card p-6 no-print">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Percentage Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatPercent(Number(v), dec)} />
              <Line type="monotone" dataKey="percentage" stroke="#3a8b96" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Plus One details */}
      {plusOneResults.length > 0 && settings && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-accent-600" /> Plus One Details</h3>
          {plusOneResults.map(({ exam, result }) => (
            <div key={exam.id} className="space-y-2 mb-4 last:mb-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{exam.name}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="card p-2"><p className="text-xs text-gray-400">TE</p><p className="font-medium">{result.teMarks ?? '—'} / {settings.plusOneMaxTE}</p></div>
                <div className="card p-2"><p className="text-xs text-gray-400">CE</p><p className="font-medium">{result.ceMarks ?? '—'} / {settings.plusOneMaxCE}</p></div>
                <div className="card p-2"><p className="text-xs text-gray-400">Total</p><p className="font-medium">{result.total !== null ? formatNumber(result.total, dec) : '—'} / {settings.plusOneMaxTotal}</p></div>
                <div className="card p-2"><p className="text-xs text-gray-400">Percentage</p><p className="font-medium">{result.percentage !== null ? formatPercent(result.percentage, dec) : '—'}</p></div>
              </div>
              <div className="text-sm space-y-1">
                <p className={result.doublePass ? 'text-success-600' : result.passed ? 'text-primary-600' : 'text-error-600'}>
                  {result.isIncomplete ? 'Status: Incomplete' : result.doublePass ? 'Status: Double Pass' : result.passed ? 'Status: Passed' : 'Status: Failed'}
                </p>
                {result.marksRequiredForDoublePass !== null && !result.doublePass && !result.isIncomplete && (
                  <p className="text-gray-500 dark:text-gray-400">
                    Marks required for Double Pass: {result.isImpossible ? `${formatNumber(result.marksRequiredForDoublePass, dec)} (impossible with remaining marks)` : formatNumber(result.marksRequiredForDoublePass, dec)}
                  </p>
                )}
                {result.marksRequiredForAPlus !== null && !result.aPlusAchieved && !result.isIncomplete && (
                  <p className="text-gray-500 dark:text-gray-400">Marks required for A+: {formatNumber(result.marksRequiredForAPlus, dec)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assignments */}
      {studentAssignments.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Assignments</h3>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{submittedCount}/{studentAssignments.length}</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">submitted ({studentAssignments.length > 0 ? formatPercent((submittedCount / studentAssignments.length) * 100, 0) : '0%'})</p>
          </div>
          <div className="space-y-1">
            {studentAssignments.map((a) => {
              const st = studentStatuses.find((s) => s.assignmentId === a.id);
              return (
                <div key={a.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{a.title}</span>
                  {st?.submitted ? <CheckCircle2 className="w-4 h-4 text-success-500" /> : <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-600" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grace marks */}
      {studentGraceMarks.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Grace Marks</h3>
          <div className="space-y-2">
            {studentGraceMarks.map((g) => (
              <div key={g.id} className="flex items-center justify-between py-1.5 text-sm border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                <div>
                  <span className="text-gray-700 dark:text-gray-300">{g.title}</span>
                  <span className="text-xs text-gray-400 ml-2">{g.category}</span>
                </div>
                <span className="font-medium text-success-600 dark:text-success-400">+{g.marks}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 font-semibold">
              <span className="text-gray-900 dark:text-white">Total Grace Marks</span>
              <span className="text-success-600 dark:text-success-400">{formatNumber(totalGrace, dec)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClassReport({
  students, cls, exams, examMarks, plusOneMarks, assignments, assignmentStatuses, graceMarks, settings,
}: {
  students: Student[]; cls: ClassRoom; exams: Exam[]; examMarks: ExamMark[]; plusOneMarks: PlusOneMark[];
  assignments: Assignment[]; assignmentStatuses: AssignmentStatus[]; graceMarks: GraceMark[]; settings: UserSettings | null;
}) {
  const dec = settings?.decimalPlaces ?? 2;
  const rankingEnabled = settings?.rankingEnabled ?? false;

  const rows = students.map((s) => {
    const regularExams = exams.filter((e) => e.type === 'regular');
    const plusOneExams = exams.filter((e) => e.type === 'plusOne');

    let combinedObtained = 0;
    let combinedMax = 0;
    for (const ex of regularExams) {
      const mark = examMarks.find((m) => m.examId === ex.id && m.studentId === s.id);
      if (mark?.marks !== null && mark?.marks !== undefined) {
        combinedObtained += mark.marks;
        combinedMax += ex.maxMarks;
      } else {
        combinedMax += ex.maxMarks;
      }
    }
    const pct = combinedMax > 0 ? (combinedObtained / combinedMax) * 100 : null;

    let passed = true;
    let doublePass = true;
    let aPlus = false;
    for (const ex of plusOneExams) {
      const pom = plusOneMarks.find((m) => m.examId === ex.id && m.studentId === s.id);
      const result = calcPlusOneResult(pom?.teMarks ?? null, pom?.ceMarks ?? null, settings || {
        plusOneMaxTE: 80, plusOneMaxCE: 20, plusOneMaxTotal: 100, requiredTEPercent: 30, requiredTotalPercent: 30, doublePassEnabled: true, aPlusThreshold: 90,
      });
      if (!result.isIncomplete) {
        if (!result.passed) passed = false;
        if (!result.doublePass) doublePass = false;
        if (result.aPlusAchieved) aPlus = true;
      }
    }
    if (plusOneExams.length === 0) { doublePass = false; }

    const studentGrace = graceMarks.filter((g) => g.studentId === s.id);
    const totalGrace = studentGrace.reduce((sum, g) => sum + g.marks, 0);

    const studentAssignments = assignments.filter((a) => a.classId === cls.id);
    const studentStatuses = assignmentStatuses.filter((st) => st.studentId === s.id);
    const submittedCount = studentStatuses.filter((st) => st.submitted).length;
    const submissionPct = studentAssignments.length > 0 ? (submittedCount / studentAssignments.length) * 100 : null;

    return {
      student: s, combinedObtained, combinedMax, pct, passed, doublePass, aPlus, totalGrace,
      submittedCount, totalAssignments: studentAssignments.length, submissionPct,
    };
  });

  const sortedRows = [...rows].sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
  const rankedRows = rankingEnabled ? sortedRows.map((r, i) => ({ ...r, rank: i + 1 })) : sortedRows;
  const getRank = (r: typeof sortedRows[number]): number | null => rankingEnabled ? sortedRows.indexOf(r) + 1 : null;

  const stats = calcClassStats(
    rows.map((r) => r.pct),
    rows.map((r) => r.passed),
    rows.map((r) => r.doublePass),
    rows.map((r) => r.aPlus),
  );

  const pieData = [
    { name: 'Passed', value: stats.passCount, color: '#22c55e' },
    { name: 'Failed', value: stats.failCount, color: '#ef4444' },
  ];

  const assignmentStats = {
    total: assignments.length,
    avgSubmission: rows.length > 0 ? rows.reduce((sum, r) => sum + (r.submissionPct ?? 0), 0) / rows.length : 0,
  };

  return (
    <div className="space-y-6 print-area">
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{cls.name} {cls.division} — Class Report</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{cls.academicYear} · {students.length} students</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Average" value={stats.average !== null ? formatPercent(stats.average, dec) : '—'} />
        <StatCard label="Highest" value={stats.highest !== null ? formatPercent(stats.highest, dec) : '—'} />
        <StatCard label="Lowest" value={stats.lowest !== null ? formatPercent(stats.lowest, dec) : '—'} />
        <StatCard label="A+ Count" value={String(stats.aPlusCount)} />
        <StatCard label="Pass" value={String(stats.passCount)} color="success" />
        <StatCard label="Fail" value={String(stats.failCount)} color="error" />
        <StatCard label="Double Pass" value={String(stats.doublePassCount)} color="primary" />
        <StatCard label="Avg Submission" value={formatPercent(assignmentStats.avgSubmission, 0)} />
      </div>

      {/* Pass/Fail pie */}
      {students.length > 0 && (
        <div className="card p-6 no-print">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Pass / Fail Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Ranking table */}
      {students.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  {rankingEnabled && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">Rank</th>}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">Roll</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Obtained</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">%</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Grace</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Assignments</th>
                </tr>
              </thead>
              <tbody>
                {rankedRows.map((r) => (
                  <tr key={r.student.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    {rankingEnabled && <td className="px-4 py-2.5 text-sm font-bold text-primary-600 dark:text-primary-400">{getRank(r)}</td>}
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">{r.student.rollNumber}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{r.student.name}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{formatNumber(r.combinedObtained, dec)}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{r.combinedMax}</td>
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300">{r.pct !== null ? formatPercent(r.pct, dec) : '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-success-600 dark:text-success-400 hidden md:table-cell">{r.totalGrace > 0 ? `+${formatNumber(r.totalGrace, dec)}` : '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">{r.submittedCount}/{r.totalAssignments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  const colors: Record<string, string> = {
    success: 'text-success-600 dark:text-success-400',
    error: 'text-error-600 dark:text-error-400',
    primary: 'text-primary-600 dark:text-primary-400',
  };
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color ? colors[color] : 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}
