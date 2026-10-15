BEGIN;

CREATE TABLE IF NOT EXISTS public.project_contribution_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) > 0),
  contact_type TEXT NOT NULL CHECK (contact_type IN ('email', 'discord', 'github', 'website', 'other')),
  contact TEXT NOT NULL CHECK (length(trim(contact)) > 0),
  skills TEXT NOT NULL CHECK (length(trim(skills)) > 0),
  contribution_type TEXT NOT NULL CHECK (contribution_type IN ('coding', 'design', 'testing', 'documentation', 'community', 'other')),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'replied', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_project_contribution_requests_project_id
  ON public.project_contribution_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_project_contribution_requests_status
  ON public.project_contribution_requests(status);
CREATE INDEX IF NOT EXISTS idx_project_contribution_requests_created_at
  ON public.project_contribution_requests(created_at DESC);

ALTER TABLE public.project_contribution_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages contribution requests" ON public.project_contribution_requests;
CREATE POLICY "Service role manages contribution requests"
  ON public.project_contribution_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.project_contribution_requests IS
  'Publicly submitted interest to contribute to a project. Messages remain review-only and are not exposed to visitors.';

COMMIT;
