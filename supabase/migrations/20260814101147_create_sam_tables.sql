/*
# Create SAM (Students Academics Manager) tables

1. New Tables
- `sam_settings` — per-user settings (one row per user)
- `sam_classes` — classes owned by a user
- `sam_students` — students belonging to a class
- `sam_exams` — exams for a class (regular or plusOne type)
- `sam_exam_marks` — marks for a student in a regular exam
- `sam_plus_one_marks` — TE/CE marks for a student in a Plus One exam
- `sam_assignments` — assignments for a class
- `sam_assignment_statuses` — submitted/not submitted per student per assignment
- `sam_grace_marks` — grace mark entries per student

All tables are owner-scoped via `user_id` (defaulting to auth.uid()) with full RLS.

2. Security
- RLS enabled on every table.
- 4 policies per table (SELECT/INSERT/UPDATE/DELETE) scoped to `auth.uid() = user_id`.
- Child tables (students, exams, assignments, marks, statuses, grace marks) also carry `user_id` for direct ownership checks.
- No public access; no anon access. Only authenticated users can access their own rows.
*/

-- Settings
CREATE TABLE IF NOT EXISTS sam_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sam_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_settings" ON sam_settings;
CREATE POLICY "select_own_settings" ON sam_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_settings" ON sam_settings;
CREATE POLICY "insert_own_settings" ON sam_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_settings" ON sam_settings;
CREATE POLICY "update_own_settings" ON sam_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_settings" ON sam_settings;
CREATE POLICY "delete_own_settings" ON sam_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Classes
CREATE TABLE IF NOT EXISTS sam_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  division text NOT NULL DEFAULT '',
  academic_year text NOT NULL DEFAULT '',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sam_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_classes" ON sam_classes;
CREATE POLICY "select_own_classes" ON sam_classes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_classes" ON sam_classes;
CREATE POLICY "insert_own_classes" ON sam_classes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_classes" ON sam_classes;
CREATE POLICY "update_own_classes" ON sam_classes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_classes" ON sam_classes;
CREATE POLICY "delete_own_classes" ON sam_classes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_sam_classes_user ON sam_classes(user_id);

-- Students
CREATE TABLE IF NOT EXISTS sam_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES sam_classes(id) ON DELETE CASCADE,
  roll_number text NOT NULL DEFAULT '',
  name text NOT NULL,
  admission_number text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sam_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_students" ON sam_students;
CREATE POLICY "select_own_students" ON sam_students FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_students" ON sam_students;
CREATE POLICY "insert_own_students" ON sam_students FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_students" ON sam_students;
CREATE POLICY "update_own_students" ON sam_students FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_students" ON sam_students;
CREATE POLICY "delete_own_students" ON sam_students FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_sam_students_user ON sam_students(user_id);
CREATE INDEX IF NOT EXISTS idx_sam_students_class ON sam_students(class_id);

-- Exams
CREATE TABLE IF NOT EXISTS sam_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES sam_classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text,
  date date,
  max_marks numeric NOT NULL DEFAULT 100,
  notes text,
  type text NOT NULL DEFAULT 'regular',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sam_exams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_exams" ON sam_exams;
CREATE POLICY "select_own_exams" ON sam_exams FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_exams" ON sam_exams;
CREATE POLICY "insert_own_exams" ON sam_exams FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_exams" ON sam_exams;
CREATE POLICY "update_own_exams" ON sam_exams FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_exams" ON sam_exams;
CREATE POLICY "delete_own_exams" ON sam_exams FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_sam_exams_user ON sam_exams(user_id);
CREATE INDEX IF NOT EXISTS idx_sam_exams_class ON sam_exams(class_id);

-- Exam Marks
CREATE TABLE IF NOT EXISTS sam_exam_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES sam_exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES sam_students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES sam_classes(id) ON DELETE CASCADE,
  marks numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);
ALTER TABLE sam_exam_marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_exam_marks" ON sam_exam_marks;
CREATE POLICY "select_own_exam_marks" ON sam_exam_marks FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_exam_marks" ON sam_exam_marks;
CREATE POLICY "insert_own_exam_marks" ON sam_exam_marks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_exam_marks" ON sam_exam_marks;
CREATE POLICY "update_own_exam_marks" ON sam_exam_marks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_exam_marks" ON sam_exam_marks;
CREATE POLICY "delete_own_exam_marks" ON sam_exam_marks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_sam_exam_marks_user ON sam_exam_marks(user_id);
CREATE INDEX IF NOT EXISTS idx_sam_exam_marks_exam ON sam_exam_marks(exam_id);
CREATE INDEX IF NOT EXISTS idx_sam_exam_marks_class ON sam_exam_marks(class_id);

-- Plus One Marks
CREATE TABLE IF NOT EXISTS sam_plus_one_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES sam_exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES sam_students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES sam_classes(id) ON DELETE CASCADE,
  te_marks numeric,
  ce_marks numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);
ALTER TABLE sam_plus_one_marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_plus_one_marks" ON sam_plus_one_marks;
CREATE POLICY "select_own_plus_one_marks" ON sam_plus_one_marks FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_plus_one_marks" ON sam_plus_one_marks;
CREATE POLICY "insert_own_plus_one_marks" ON sam_plus_one_marks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_plus_one_marks" ON sam_plus_one_marks;
CREATE POLICY "update_own_plus_one_marks" ON sam_plus_one_marks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_plus_one_marks" ON sam_plus_one_marks;
CREATE POLICY "delete_own_plus_one_marks" ON sam_plus_one_marks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_sam_plus_one_marks_user ON sam_plus_one_marks(user_id);
CREATE INDEX IF NOT EXISTS idx_sam_plus_one_marks_exam ON sam_plus_one_marks(exam_id);
CREATE INDEX IF NOT EXISTS idx_sam_plus_one_marks_class ON sam_plus_one_marks(class_id);

-- Assignments
CREATE TABLE IF NOT EXISTS sam_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES sam_classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text,
  due_date date,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sam_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_assignments" ON sam_assignments;
CREATE POLICY "select_own_assignments" ON sam_assignments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_assignments" ON sam_assignments;
CREATE POLICY "insert_own_assignments" ON sam_assignments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_assignments" ON sam_assignments;
CREATE POLICY "update_own_assignments" ON sam_assignments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_assignments" ON sam_assignments;
CREATE POLICY "delete_own_assignments" ON sam_assignments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_sam_assignments_user ON sam_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_sam_assignments_class ON sam_assignments(class_id);

-- Assignment Statuses
CREATE TABLE IF NOT EXISTS sam_assignment_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES sam_assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES sam_students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES sam_classes(id) ON DELETE CASCADE,
  submitted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);
ALTER TABLE sam_assignment_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_assignment_statuses" ON sam_assignment_statuses;
CREATE POLICY "select_own_assignment_statuses" ON sam_assignment_statuses FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_assignment_statuses" ON sam_assignment_statuses;
CREATE POLICY "insert_own_assignment_statuses" ON sam_assignment_statuses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_assignment_statuses" ON sam_assignment_statuses;
CREATE POLICY "update_own_assignment_statuses" ON sam_assignment_statuses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_assignment_statuses" ON sam_assignment_statuses;
CREATE POLICY "delete_own_assignment_statuses" ON sam_assignment_statuses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_sam_assignment_statuses_user ON sam_assignment_statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_sam_assignment_statuses_assignment ON sam_assignment_statuses(assignment_id);
CREATE INDEX IF NOT EXISTS idx_sam_assignment_statuses_class ON sam_assignment_statuses(class_id);

-- Grace Marks
CREATE TABLE IF NOT EXISTS sam_grace_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Other',
  date date,
  student_id uuid NOT NULL REFERENCES sam_students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES sam_classes(id) ON DELETE CASCADE,
  marks numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sam_grace_marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_grace_marks" ON sam_grace_marks;
CREATE POLICY "select_own_grace_marks" ON sam_grace_marks FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_grace_marks" ON sam_grace_marks;
CREATE POLICY "insert_own_grace_marks" ON sam_grace_marks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_grace_marks" ON sam_grace_marks;
CREATE POLICY "update_own_grace_marks" ON sam_grace_marks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_grace_marks" ON sam_grace_marks;
CREATE POLICY "delete_own_grace_marks" ON sam_grace_marks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_sam_grace_marks_user ON sam_grace_marks(user_id);
CREATE INDEX IF NOT EXISTS idx_sam_grace_marks_class ON sam_grace_marks(class_id);
CREATE INDEX IF NOT EXISTS idx_sam_grace_marks_student ON sam_grace_marks(student_id);
