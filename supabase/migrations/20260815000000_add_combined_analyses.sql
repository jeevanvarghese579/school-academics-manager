-- Version 1.0.2: user-owned definitions for non-destructive combined analyses.
CREATE TABLE IF NOT EXISTS sam_combined_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES sam_classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  exam_ids uuid[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cardinality(exam_ids) >= 2)
);
ALTER TABLE sam_combined_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_combined_analyses" ON sam_combined_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_combined_analyses" ON sam_combined_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_combined_analyses" ON sam_combined_analyses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_combined_analyses" ON sam_combined_analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_sam_combined_analyses_user ON sam_combined_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_sam_combined_analyses_class ON sam_combined_analyses(class_id);
