CREATE TABLE IF NOT EXISTS site_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  project_name text NOT NULL DEFAULT 'My Project',
  date timestamptz NOT NULL DEFAULT now(),
  work_completed text NOT NULL DEFAULT '',
  labor_count integer DEFAULT 0,
  materials_used text DEFAULT '',
  payments numeric DEFAULT 0,
  delay_reason text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own site logs"
  ON site_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own site logs"
  ON site_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own site logs"
  ON site_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own site logs"
  ON site_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Admin read-all policy
CREATE POLICY "Admins can read all site logs"
  ON site_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
    )
  );
