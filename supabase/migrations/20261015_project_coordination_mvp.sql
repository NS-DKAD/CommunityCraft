-- CommunityCraft Project Coordination MVP
-- Migration: 20261015_project_coordination_mvp.sql
-- Scope: database only. This migration changes only the Supabase schema and security model.
-- It does not implement application UI, authentication, moderation workflows, or project visibility logic.
-- Pre-apply check: PostgreSQL 17.11.0.003 and PostgREST 14.18 are confirmed for this instance.
-- This migration keeps the existing view contract stable and defers any additional permission changes to verified requirements.

BEGIN;

-- 1) Keep the current catalog compatible with the existing schema.
--    The original `projects` table already contains the canonical GitHub URL.
--    We do not duplicate that value in `project_links`.
ALTER TABLE public.projects
  ALTER COLUMN github_url DROP NOT NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS goal TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Proposed'
    CHECK (status IN ('Proposed', 'Seeking collaborators', 'In development', 'Completed', 'Inactive')),
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'community'
    CHECK (source_type IN ('official', 'community', 'external', 'unverified')),
  ADD COLUMN IF NOT EXISTS source_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discussion_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT;

UPDATE public.projects
SET
  status = COALESCE(status, 'Proposed'),
  source_type = COALESCE(source_type, 'community'),
  source_verified = COALESCE(source_verified, false)
WHERE status IS NULL OR source_type IS NULL OR source_verified IS NULL;

COMMENT ON COLUMN public.projects.github_url IS
  'Canonical GitHub repository URL for the project. This is the only authoritative repository URL; other links go to project_links.';

COMMENT ON COLUMN public.projects.status IS
  'Allowed values: Proposed, Seeking collaborators, In development, Completed, Inactive.';

COMMENT ON COLUMN public.projects.source_verified IS
  'true = a moderator or authorized maintainer explicitly confirmed the original source; false = community listing or unverified source.';

-- 2) Additional links table.
--    Used for discussion, website, docs, secondary repositories, etc.
--    GitHub remains canonical in projects.github_url.
CREATE TABLE IF NOT EXISTS public.project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('website', 'discussion', 'repository', 'docs', 'other')),
  url TEXT NOT NULL CHECK (length(trim(url)) > 0),
  label TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (project_id, link_type, url)
);

-- 3) Participants with role-based relationships.
--    Public self-assignment is not allowed in this MVP; rows must be reviewed before becoming public.
CREATE TABLE IF NOT EXISTS public.project_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) > 0),
  relationship TEXT NOT NULL CHECK (relationship IN ('developer', 'co_developer', 'contributor', 'follower')),
  profile_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

-- PostgreSQL-safe deduplication for normalized display names.
-- This prevents duplicate participant entries caused by casing or extra spaces.
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_participants_unique_name_role
  ON public.project_participants (project_id, relationship, lower(btrim(display_name)));

-- 4) Related projects.
CREATE TABLE IF NOT EXISTS public.project_related (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  related_project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'related' CHECK (relationship IN ('related', 'alternative', 'successor', 'fork')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (project_id, related_project_id),
  CHECK (project_id <> related_project_id)
);

-- 5) Reporting table.
--    Reports are for moderation review only and cannot automatically hide a project.
CREATE TABLE IF NOT EXISTS public.project_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reporter_name TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('misleading', 'suspicious', 'broken_link', 'spam', 'other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

-- 6) Supporting indexes.
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_source_verified ON public.projects(source_verified);
CREATE INDEX IF NOT EXISTS idx_projects_source_type ON public.projects(source_type);

CREATE INDEX IF NOT EXISTS idx_project_links_project_id ON public.project_links(project_id);
CREATE INDEX IF NOT EXISTS idx_project_links_type ON public.project_links(link_type);

CREATE INDEX IF NOT EXISTS idx_project_participants_project_id ON public.project_participants(project_id);
CREATE INDEX IF NOT EXISTS idx_project_participants_relationship ON public.project_participants(relationship);
CREATE INDEX IF NOT EXISTS idx_project_participants_review_status ON public.project_participants(review_status);

CREATE INDEX IF NOT EXISTS idx_project_related_project_id ON public.project_related(project_id);
CREATE INDEX IF NOT EXISTS idx_project_related_related_project_id ON public.project_related(related_project_id);

CREATE INDEX IF NOT EXISTS idx_project_reports_project_id ON public.project_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_project_reports_status ON public.project_reports(status);

-- 7) Enable row-level security on new tables.
ALTER TABLE public.project_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_related ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;

-- 8) Public read policies for approved data only.
DROP POLICY IF EXISTS "Public read approved project links" ON public.project_links;
CREATE POLICY "Public read approved project links"
  ON public.project_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_id AND p.is_approved = true
    )
  );

DROP POLICY IF EXISTS "Public read approved project participants" ON public.project_participants;
CREATE POLICY "Public read approved project participants"
  ON public.project_participants FOR SELECT
  USING (
    review_status = 'approved'
    AND is_public = true
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_id AND p.is_approved = true
    )
  );

DROP POLICY IF EXISTS "Public read approved project related" ON public.project_related;
CREATE POLICY "Public read approved project related"
  ON public.project_related FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p1
      WHERE p1.id = project_id AND p1.is_approved = true
    )
    AND EXISTS (
      SELECT 1
      FROM public.projects p2
      WHERE p2.id = related_project_id AND p2.is_approved = true
    )
  );

-- 9) Restrict write access for the MVP.
--    No public INSERT/UPDATE/DELETE policy is created here.
--    This prevents unauthenticated users from self-assigning project roles or modifying related data.
DROP POLICY IF EXISTS "Service role manages project links" ON public.project_links;
CREATE POLICY "Service role manages project links"
  ON public.project_links
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages project participants" ON public.project_participants;
CREATE POLICY "Service role manages project participants"
  ON public.project_participants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages project related" ON public.project_related;
CREATE POLICY "Service role manages project related"
  ON public.project_related
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages project reports" ON public.project_reports;
CREATE POLICY "Service role manages project reports"
  ON public.project_reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 10) Keep the current view contract stable and append the new coordination columns at the end.
CREATE OR REPLACE VIEW public.projects_with_stats
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.slug,
  p.name,
  p.author_name AS author,
  p.description,
  p.category,
  p.tags,
  p.github_url AS "githubUrl",
  p.is_approved,
  p.created_at,
  p.updated_at,
  COALESCE(s.stars, 0) AS stars,
  COALESCE(s.forks, 0) AS forks,
  COALESCE(s.open_issues, 0) AS open_issues,
  COALESCE(s.license, 'MIT') AS license,
  s.last_github_commit_at,
  s.synced_at,
  p.goal,
  p.status,
  p.source_type,
  p.source_verified,
  p.discussion_url,
  p.website_url
FROM public.projects p
LEFT JOIN public.project_github_stats s ON p.id = s.project_id;

COMMENT ON TABLE public.project_participants IS
  'Public role assignment is not permitted in the MVP. Rows are only displayed after manual review approval.';

COMMENT ON TABLE public.project_reports IS
  'Reports are for moderation review only. They cannot automatically hide, block, or approve a project.';

COMMIT;
