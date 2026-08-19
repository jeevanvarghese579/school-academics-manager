import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileBarChart, Printer, Search, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  Assignment,
  AssignmentStatus,
  ClassRoom,
  CombinedAnalysis,
  Exam,
  ExamMark,
  GraceMark,
  PlusOneMark,
  Student,
  UserSettings,
} from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import {
  calcCombinedPercentage,
  calcPercentage,
  calcPlusOneResult,
  formatMark,
  formatPercent,
} from "@/utils/calculations";
import { classReportExamSchema } from "@/utils/reportColumns";
import { matchesStudentSearch, normalExamHeader } from "@/utils/reportPresentation";
import { normalExamMarkTone, plusOneTEPercentageTone } from "@/utils/reportMarkStyle";
import { academicResultSortValue, formatAcademicResult, percentageResultTone, type AcademicResultMode } from "@/utils/reportResultPresentation";

type Direction = "asc" | "desc";

export function Reports() {
  const { repo } = useApp();
  const [search, setSearch] = useSearchParams();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [combined, setCombined] = useState<CombinedAnalysis[]>([]);
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [plus, setPlus] = useState<PlusOneMark[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [statuses, setStatuses] = useState<AssignmentStatus[]>([]);
  const [grace, setGrace] = useState<GraceMark[]>([]);
  const classId = search.get("class") ?? "";

  useEffect(() => {
    if (repo)
      void Promise.all([
        repo.getClasses(),
        repo.getStudents(),
        repo.getExams(),
        repo.getSettings(),
      ]).then(([c, s, e, x]) => {
        setClasses(c);
        setStudents(s);
        setAllExams(e);
        setSettings(x);
      });
  }, [repo]);
  useEffect(() => {
    if (repo && classId)
      void Promise.all([
        repo.getCombinedAnalyses(classId),
        repo.getAllMarksForClass(classId),
        repo.getAllPlusOneMarksForClass(classId),
        repo.getAssignments(classId),
        repo.getAllAssignmentStatusesForClass(classId),
        repo.getGraceMarks(classId),
      ]).then(([c, m, p, a, st, g]) => {
        setCombined(c);
        setMarks(m);
        setPlus(p);
        setAssignments(a);
        setStatuses(st);
        setGrace(g);
      });
  }, [repo, classId]);
  const updateSearch = (updates: Record<string, string | null>) =>
    setSearch(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(updates).forEach(([key, value]) =>
          value ? next.set(key, value) : next.delete(key),
        );
        return next;
      },
      { replace: true },
    );
  if (!classes.length)
    return (
      <EmptyState
        icon={<FileBarChart />}
        title="No data for reports"
        description="Create a class first."
        action={
          <Link to="/classes" className="btn-primary">
            Go to Classes
          </Link>
        }
      />
    );
  const classStudents = students
    .filter((student) => student.classId === classId)
    .sort((a, b) =>
      a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }),
    );
  const schema = classReportExamSchema(allExams, classId);
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        {classId && (
          <button className="btn-primary" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        )}
      </div>
      <div className="card p-5">
        <label className="label">Class</label>
        <select
          className="input"
          value={classId}
          onChange={(event) =>
            updateSearch({
              class: event.target.value,
              sort: null,
              dir: null,
              hidden: null,
              studentSearch: null,
            })
          }
        >
          <option value="">Choose a class...</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} {item.division}
            </option>
          ))}
        </select>
      </div>
      {classId && (
        <ClassReport
          students={classStudents}
          regular={schema.regular}
          hasPlusOne={schema.hasPlusOne}
          marks={marks}
          plus={plus}
          combined={combined}
          assignments={assignments}
          statuses={statuses}
          grace={grace}
          settings={settings}
          search={search}
          updateSearch={updateSearch}
        />
      )}
    </div>
  );
}

function ClassReport({
  students,
  regular,
  hasPlusOne,
  marks,
  plus,
  combined,
  assignments,
  statuses,
  grace,
  settings,
  search,
  updateSearch,
}: {
  students: Student[];
  regular: Exam[];
  hasPlusOne: boolean;
  marks: ExamMark[];
  plus: PlusOneMark[];
  combined: CombinedAnalysis[];
  assignments: Assignment[];
  statuses: AssignmentStatus[];
  grace: GraceMark[];
  settings: UserSettings | null;
  search: URLSearchParams;
  updateSearch: (updates: Record<string, string | null>) => void;
}) {
  const [sort, setSort] = useState(search.get("sort") ?? "roll");
  const [dir, setDir] = useState<Direction>(
    search.get("dir") === "desc" ? "desc" : "asc",
  );
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set((search.get("hidden") ?? "").split(",").filter(Boolean)),
  );
  const [studentSearch, setStudentSearch] = useState(search.get("studentSearch") ?? "");
  const [resultMode, setResultMode] = useState<AcademicResultMode>(() => {
    try { return sessionStorage.getItem("classReportResultMode") === "marks" ? "marks" : "percentage"; }
    catch { return "percentage"; }
  });
  const config = settings ?? DEFAULT_SETTINGS;
  const dec = settings?.decimalPlaces ?? 2;
  useEffect(() => {
    updateSearch({
      sort: sort === "roll" ? null : sort,
      dir: dir === "asc" ? null : dir,
      hidden: hidden.size ? [...hidden].join(",") : null,
      studentSearch: studentSearch || null,
    });
  }, [sort, dir, hidden, studentSearch]);
  useEffect(() => {
    try { sessionStorage.setItem("classReportResultMode", resultMode); } catch { /* optional */ }
  }, [resultMode]);
  const visible = (key: string) => !hidden.has(key);
  const toggle = (key: string) => {
    setHidden((old) => {
      const next = new Set(old);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    if (sort === key) setSort("roll");
  };
  const rows = useMemo(
    () =>
      students.map((student) => {
        const record = hasPlusOne
          ? plus.find((entry) => entry.studentId === student.id)
          : undefined;
        const po = record
          ? calcPlusOneResult(record.teMarks, record.ceMarks, config)
          : null;
        return {
          student,
          po,
          examValues: Object.fromEntries(
            regular.map((exam) => [
              exam.id,
              marks.find(
                (entry) =>
                  entry.examId === exam.id && entry.studentId === student.id,
              )?.marks ?? null,
            ]),
          ),
          combinedValues: Object.fromEntries(
            combined.map((analysis) => [
              analysis.id,
              calcCombinedPercentage(
                regular
                  .filter((exam) => analysis.examIds.includes(exam.id))
                  .map((exam) => ({
                    obtained:
                      marks.find(
                        (entry) =>
                          entry.examId === exam.id &&
                          entry.studentId === student.id,
                      )?.marks ?? null,
                    maxMarks: exam.maxMarks,
                  })),
              ),
            ]),
          ),
          submitted: statuses.filter(
            (status) => status.studentId === student.id && status.submitted,
          ).length,
          grace: grace
            .filter((entry) => entry.studentId === student.id)
            .reduce((sum, entry) => sum + entry.marks, 0),
        };
      }),
    [
      students,
      hasPlusOne,
      plus,
      config,
      regular,
      marks,
      combined,
      statuses,
      grace,
    ],
  );
  const value = (row: (typeof rows)[number]) =>
    sort === "roll"
      ? row.student.rollNumber
      : sort === "plus"
        ? academicResultSortValue(resultMode, row.po?.teMarks ?? null, row.po?.tePercentage ?? null)
        : sort === "assign"
          ? row.submitted
          : sort === "grace"
            ? row.grace
            : sort.startsWith("combined:")
              ? academicResultSortValue(resultMode, row.combinedValues[sort.slice(9)]?.combinedObtained ?? null, row.combinedValues[sort.slice(9)]?.combinedPercentage ?? null)
              : academicResultSortValue(resultMode, row.examValues[sort] ?? null, regular.find((exam) => exam.id === sort) ? calcPercentage(row.examValues[sort] ?? null, regular.find((exam) => exam.id === sort)!.maxMarks) : null);
  const shown = rows.filter((row) => matchesStudentSearch(row.student, studentSearch)).sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    const compare =
      typeof av === "string" && typeof bv === "string"
        ? av.localeCompare(bv, undefined, { numeric: true })
        : Number(av) - Number(bv);
    return dir === "asc" ? compare : -compare;
  });
  const column = (key: string, label: string) => (
    <th
      key={key}
      className="px-3 py-3 text-left text-xs uppercase cursor-pointer"
      onClick={() =>
        sort === key
          ? setDir(dir === "asc" ? "desc" : "asc")
          : (setSort(key), setDir("asc"))
      }
    >
      {label}
    </th>
  );
  const examColumn = (exam: Exam) => {
    const header = normalExamHeader(exam);
    return <th key={exam.id} className="px-3 py-2 text-left text-xs uppercase cursor-pointer" onClick={() => sort === exam.id ? setDir(dir === "asc" ? "desc" : "asc") : (setSort(exam.id), setDir("asc"))}><div>{header.name}</div><div className="mt-0.5 normal-case text-[11px] font-normal text-gray-500">{header.maximum}</div></th>;
  };
  const assignmentColumn = () => <th className="px-3 py-2 text-left text-xs uppercase cursor-pointer" onClick={() => sort === "assign" ? setDir(dir === "asc" ? "desc" : "asc") : (setSort("assign"), setDir("asc"))}><div>Assignments</div><div className="mt-0.5 normal-case text-[11px] font-normal text-gray-500">Total {assignments.length}</div></th>;
  const markClass = (mark: number | null, exam: Exam) => ({ failed: "bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300", aplus: "bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300", normal: "", neutral: "text-gray-400" }[normalExamMarkTone(mark, exam.maxMarks, config)]);
  const metric = (
    n: number | null | undefined,
    po: ReturnType<typeof calcPlusOneResult> | null,
    achieved: boolean,
  ) =>
    !po
      ? "—"
      : po.teMarks === null
        ? "Not entered"
        : achieved
          ? "0"
          : formatMark(n ?? 0);
  const items = [
    ...(hasPlusOne
      ? ([
          ["plus", "Plus One TE"],
          ["double", "Double Pass Required"],
          ["aplus", "A+ Required"],
          ["double-aplus", "Double A+ Required"],
        ] as [string, string][])
      : []),
    ...regular.map((exam) => [exam.id, exam.name] as [string, string]),
    ...combined.map(
      (analysis) =>
        [`combined:${analysis.id}`, analysis.name] as [string, string],
    ),
    ["assign", "Assignment status"],
    ["grace", "Grace marks"] as [string, string],
  ];
  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center gap-2" role="group" aria-label="Academic result display">
        <span className="text-sm font-medium mr-1">Display results:</span>
        <button type="button" className={resultMode === "marks" ? "btn-primary" : "btn-secondary"} onClick={() => setResultMode("marks")}>Marks</button>
        <button type="button" className={resultMode === "percentage" ? "btn-primary" : "btn-secondary"} onClick={() => setResultMode("percentage")}>Percentage</button>
      </div>
      <div className="card p-5">
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            Visible report fields
          </summary>
          <div className="mt-3 flex flex-wrap gap-4">
            {items.map(([key, label]) => (
              <label key={key} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={visible(key)}
                  onChange={() => toggle(key)}
                />
                {label}
              </label>
            ))}
          </div>
        </details>
      </div>
      <div className="card p-4"><label className="label" htmlFor="report-student-search">Search students</label><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input id="report-student-search" className="input pl-9 pr-10" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search students..." />{studentSearch && <button className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon" onClick={() => setStudentSearch("")} aria-label="Clear student search"><X className="w-4 h-4" /></button>}</div></div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                {column("roll", "Roll")}
                {column("name", "Student")}
                {hasPlusOne &&
                  visible("plus") &&
                  column("plus", "Plus One TE")}
                {hasPlusOne && visible("double") && (
                  <th>Double Pass Required</th>
                )}
                {hasPlusOne && visible("aplus") && <th>A+ Required</th>}
                {hasPlusOne && visible("double-aplus") && (
                  <th>Double A+ Required</th>
                )}
                {regular
                  .filter((exam) => visible(exam.id))
                  .map(examColumn)}
                {combined
                  .filter((analysis) => visible(`combined:${analysis.id}`))
                  .map((analysis) =>
                    column(`combined:${analysis.id}`, analysis.name),
                  )}
                {visible("assign") && assignmentColumn()}
                {visible("grace") && column("grace", "Grace")}
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.student.id} className="border-t">
                  <td>{row.student.rollNumber}</td>
                  <td>
                    <Link
                      className="text-primary-600 hover:underline font-medium"
                      to={`/reports/student/${row.student.id}?return=${encodeURIComponent(`?${search.toString()}`)}`}
                    >
                      {row.student.name}
                    </Link>
                  </td>
                  {hasPlusOne && visible("plus") && (
                    <td>
                      {!row.po
                        ? "—"
                        : row.po.teMarks === null
                          ? <span className="text-gray-400">—</span>
                          : <span className={plusOneTEPercentageTone(row.po.tePercentage, config.requiredTEPercent) === "failed" ? "inline-block rounded px-2 py-0.5 bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300" : ""}>{formatAcademicResult(resultMode, row.po.teMarks, row.po.tePercentage, dec)}</span>}
                    </td>
                  )}
                  {hasPlusOne && visible("double") && (
                    <td>
                      {metric(
                        row.po?.marksRequiredForDoublePass,
                        row.po,
                        row.po?.doublePass ?? false,
                      )}
                    </td>
                  )}
                  {hasPlusOne && visible("aplus") && (
                    <td>
                      {metric(
                        row.po?.marksRequiredForAPlus,
                        row.po,
                        row.po?.aPlusAchieved ?? false,
                      )}
                    </td>
                  )}
                  {hasPlusOne && visible("double-aplus") && (
                    <td>
                      {metric(
                        row.po?.marksRequiredForDoubleAPlus,
                        row.po,
                        row.po?.doubleAPlusAchieved ?? false,
                      )}
                    </td>
                  )}
                  {regular
                    .filter((exam) => visible(exam.id))
                    .map((exam) => (
                      <td key={exam.id}><span className={`inline-block rounded px-2 py-0.5 ${markClass(row.examValues[exam.id], exam)}`}>{formatAcademicResult(resultMode, row.examValues[exam.id], calcPercentage(row.examValues[exam.id], exam.maxMarks), dec)}</span></td>
                    ))}
                  {combined
                    .filter((analysis) => visible(`combined:${analysis.id}`))
                    .map((analysis) => {
                      const result = row.combinedValues[analysis.id];
                      return (
                        <td key={analysis.id}><span className={percentageResultTone(result.combinedPercentage, config.requiredTEPercent) === "failed" ? "inline-block rounded px-2 py-0.5 bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300" : ""}>{formatAcademicResult(resultMode, result.combinedObtained, result.combinedPercentage, dec)}</span></td>
                      );
                    })}
                  {visible("assign") && (
                    <td>{row.submitted}</td>
                  )}
                  {visible("grace") && <td>{row.grace || "—"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
