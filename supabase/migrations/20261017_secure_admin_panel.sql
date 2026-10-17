-- Secure moderation panel foundation. Review and execute manually; this file is
-- never run by the application or by local verification commands.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.projects') IS NULL
     OR to_regclass('public.project_contribution_requests') IS NULL THEN
    RAISE EXCEPTION 'Admin panel migration stopped: projects and project_contribution_requests must already exist.';
  END IF;
END $$;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS moderation_status TEXT;

UPDATE public.projects
SET moderation_status = CASE WHEN is_approved THEN 'approved' ELSE 'pending' END
WHERE moderation_status IS NULL;
ALTER TABLE public.projects
  ALTER COLUMN moderation_status SET DEFAULT 'pending',
  ALTER COLUMN moderation_status SET NOT NULL;
ALTER TABLE public.projects ALTER COLUMN is_approved SET DEFAULT false;

-- Keep the pre-existing public-visibility flag aligned before enabling the new
-- stateful queue, so a pre-existing rejected state can never stay public.
UPDATE public.projects
SET is_approved = (moderation_status = 'approved')
WHERE is_approved IS DISTINCT FROM (moderation_status = 'approved');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_moderation_status_check'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_moderation_status_check
      CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_moderation_status_created_at
  ON public.projects(moderation_status, created_at DESC);

CREATE OR REPLACE FUNCTION public.sync_project_moderation_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.is_approved := (NEW.moderation_status = 'approved');
  ELSIF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
    NEW.is_approved := (NEW.moderation_status = 'approved');
  ELSIF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
    NEW.moderation_status := CASE WHEN NEW.is_approved THEN 'approved' ELSE 'pending' END;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trigger_projects_sync_moderation_state ON public.projects;
CREATE TRIGGER trigger_projects_sync_moderation_state
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.sync_project_moderation_state();

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_users FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_users TO authenticated;
DROP POLICY IF EXISTS "Admins can read own allowlist entry" ON public.admin_users;
CREATE POLICY "Admins can read own allowlist entry"
  ON public.admin_users FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.is_communitycraft_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au WHERE au.user_id = (SELECT auth.uid())
  );
$$;
REVOKE ALL ON FUNCTION public.is_communitycraft_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_communitycraft_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.moderation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'contribution_request')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  before_state JSONB NOT NULL,
  after_state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_moderation_events_entity_created
  ON public.moderation_events(entity_type, entity_id, created_at DESC);
ALTER TABLE public.moderation_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.moderation_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.moderation_events TO authenticated;
DROP POLICY IF EXISTS "Admins can read moderation events" ON public.moderation_events;
CREATE POLICY "Admins can read moderation events"
  ON public.moderation_events FOR SELECT TO authenticated
  USING ((SELECT public.is_communitycraft_admin()));

-- Add admin read access while preserving the existing approved-only public policy.
DROP POLICY IF EXISTS "Admins can read all projects" ON public.projects;
CREATE POLICY "Admins can read all projects"
  ON public.projects FOR SELECT TO authenticated
  USING ((SELECT public.is_communitycraft_admin()));
REVOKE INSERT, UPDATE, DELETE ON public.projects FROM anon, authenticated;
GRANT SELECT ON public.projects TO authenticated;

DROP POLICY IF EXISTS "Admins can read project tags" ON public.project_tags;
CREATE POLICY "Admins can read project tags"
  ON public.project_tags FOR SELECT TO authenticated
  USING ((SELECT public.is_communitycraft_admin()));
DROP POLICY IF EXISTS "Admins can read project replacements" ON public.project_replacements;
CREATE POLICY "Admins can read project replacements"
  ON public.project_replacements FOR SELECT TO authenticated
  USING ((SELECT public.is_communitycraft_admin()));

ALTER TABLE public.project_contribution_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_contribution_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.project_contribution_requests TO authenticated;
DROP POLICY IF EXISTS "Admins can read contribution requests" ON public.project_contribution_requests;
CREATE POLICY "Admins can read contribution requests"
  ON public.project_contribution_requests FOR SELECT TO authenticated
  USING ((SELECT public.is_communitycraft_admin()));

-- Update a project and append its audit record in one database transaction.
CREATE OR REPLACE FUNCTION public.admin_save_project(
  p_project_id UUID,
  p_fields JSONB,
  p_moderation_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  old_state JSONB;
  new_state JSONB;
BEGIN
  IF NOT (SELECT public.is_communitycraft_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_moderation_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid moderation status' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_fields) <> 'object'
     OR p_fields - ARRAY['name','author_name','description','category','goal','status','github_url','website_url','discussion_url'] <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid project fields' USING ERRCODE = '22023';
  END IF;
  IF length(trim(coalesce(p_fields->>'name',''))) NOT BETWEEN 2 AND 100
     OR length(trim(coalesce(p_fields->>'author_name',''))) NOT BETWEEN 2 AND 80
     OR length(trim(coalesce(p_fields->>'description',''))) NOT BETWEEN 20 AND 5000
     OR p_fields->>'category' NOT IN ('Tools','Mods','Shaders','Rendering & Assets','Libraries','Software','Website','Plugin','Games')
     OR coalesce(p_fields->>'status','') NOT IN ('Proposed','Seeking collaborators','In development','Completed','Inactive') THEN
    RAISE EXCEPTION 'Project fields failed database validation' USING ERRCODE = '22023';
  END IF;

  SELECT jsonb_build_object(
    'name', p.name, 'author_name', p.author_name, 'description', p.description,
    'category', p.category, 'goal', p.goal, 'status', p.status,
    'github_url', p.github_url, 'website_url', p.website_url,
    'discussion_url', p.discussion_url, 'moderation_status', p.moderation_status
  ) INTO old_state FROM public.projects p WHERE p.id = p_project_id FOR UPDATE;
  IF old_state IS NULL THEN RAISE EXCEPTION 'Project not found' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.projects
  SET name = trim(p_fields->>'name'),
      author_name = trim(p_fields->>'author_name'),
      description = trim(p_fields->>'description'),
      category = p_fields->>'category',
      goal = nullif(trim(p_fields->>'goal'), ''),
      status = p_fields->>'status',
      github_url = nullif(trim(p_fields->>'github_url'), ''),
      website_url = nullif(trim(p_fields->>'website_url'), ''),
      discussion_url = nullif(trim(p_fields->>'discussion_url'), ''),
      moderation_status = p_moderation_status,
      is_approved = (p_moderation_status = 'approved'),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_project_id;

  SELECT jsonb_build_object(
    'name', p.name, 'author_name', p.author_name, 'description', p.description,
    'category', p.category, 'goal', p.goal, 'status', p.status,
    'github_url', p.github_url, 'website_url', p.website_url,
    'discussion_url', p.discussion_url, 'moderation_status', p.moderation_status
  ) INTO new_state FROM public.projects p WHERE p.id = p_project_id;

  INSERT INTO public.moderation_events(actor_id, entity_type, entity_id, action, before_state, after_state)
  VALUES ((SELECT auth.uid()), 'project', p_project_id,
    CASE WHEN old_state->>'moderation_status' IS DISTINCT FROM p_moderation_status
      THEN 'project_moderated' ELSE 'project_edited' END,
    old_state, new_state);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_save_project(UUID, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_project(UUID, JSONB, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_contribution_request(
  p_request_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  old_state JSONB;
  new_state JSONB;
BEGIN
  IF NOT (SELECT public.is_communitycraft_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('new','reviewed','replied','dismissed') THEN
    RAISE EXCEPTION 'Invalid contribution status' USING ERRCODE = '22023';
  END IF;
  SELECT jsonb_build_object('status', r.status, 'reviewed_at', r.reviewed_at, 'reviewed_by', r.reviewed_by)
    INTO old_state FROM public.project_contribution_requests r WHERE r.id = p_request_id FOR UPDATE;
  IF old_state IS NULL THEN RAISE EXCEPTION 'Contribution request not found' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.project_contribution_requests
  SET status = p_status,
      reviewed_at = CASE WHEN p_status = 'new' THEN NULL ELSE timezone('utc'::text, now()) END,
      reviewed_by = CASE WHEN p_status = 'new' THEN NULL ELSE (SELECT auth.uid())::text END
  WHERE id = p_request_id;

  SELECT jsonb_build_object('status', r.status, 'reviewed_at', r.reviewed_at, 'reviewed_by', r.reviewed_by)
    INTO new_state FROM public.project_contribution_requests r WHERE r.id = p_request_id;

  INSERT INTO public.moderation_events(actor_id, entity_type, entity_id, action, before_state, after_state)
  VALUES ((SELECT auth.uid()), 'contribution_request', p_request_id, 'contribution_status_changed', old_state, new_state);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_contribution_request(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_contribution_request(UUID, TEXT) TO authenticated;

COMMENT ON TABLE public.admin_users IS 'Explicit admin allowlist. Rows are added by a trusted project owner in Supabase SQL Editor; Discord login alone grants no admin access.';
COMMENT ON TABLE public.moderation_events IS 'Append-only project moderation and collaboration-request status audit events.';
COMMENT ON COLUMN public.projects.moderation_status IS 'Admin queue state; is_approved remains synchronized for existing public catalogue RLS.';

COMMIT;
