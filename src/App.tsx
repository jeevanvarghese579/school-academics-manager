import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { AppShell } from '@/components/AppShell';
import { Landing } from '@/components/Landing';
import { Dashboard } from '@/pages/Dashboard';
import { Classes } from '@/pages/Classes';
import { ClassDetail } from '@/pages/ClassDetail';
import { Exams } from '@/pages/Exams';
import { ExamDetail } from '@/pages/ExamDetail';
import { Assignments, AssignmentDetail } from '@/pages/Assignments';
import { GraceMarks } from '@/pages/GraceMarks';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';
import { ImportExport } from '@/pages/ImportExport';
import { CombinedAnalysis } from '@/pages/CombinedAnalysis';

function AppRoutes() {
  const { mode, loading } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading SAM...</div>
      </div>
    );
  }

  if (!mode) return <Landing />;

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/classes/:id" element={<ClassDetail />} />
        <Route path="/exams" element={<Exams />} />
        <Route path="/exams/:id" element={<ExamDetail />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route path="/assignments/:id" element={<AssignmentDetail />} />
        <Route path="/grace-marks" element={<GraceMarks />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/combined" element={<CombinedAnalysis />} />
        <Route path="/import-export" element={<ImportExport />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

function App() {
  return <AppRoutes />;
}

export default App;
