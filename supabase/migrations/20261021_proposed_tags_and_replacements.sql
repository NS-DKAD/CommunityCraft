-- Migration: Add proposed tags and proposed replacement applications to projects (20261021)
-- Safe, additive migration: adds columns to store custom user proposals awaiting admin review.
-- Does not alter existing canonical catalog tables or constraints.

BEGIN;

-- 1. Preflight check: ensure projects table exists
DO $$
BEGIN
  IF to_regclass('public.projects') IS NULL THEN
    RAISE EXCEPTION 'Migration aborted: public.projects does not exist.';
  END IF;
END $$;

-- 2. Add proposed_tags column (TEXT[]): stores user-suggested tags awaiting canonical admin approval
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS proposed_tags TEXT[] NOT NULL DEFAULT '{}';

-- 3. Add proposed_replacements column (JSONB): stores user-suggested application alternatives awaiting admin review
-- Format: [{"name": "Blender", "level": "Partial"}]
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS proposed_replacements JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 4. Add constraints to enforce data integrity and prevent abusive payloads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_proposed_tags_length_check'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_proposed_tags_length_check
      CHECK (array_length(proposed_tags, 1) IS NULL OR array_length(proposed_tags, 1) <= 10);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_proposed_replacements_check'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_proposed_replacements_check
      CHECK (
        jsonb_typeof(proposed_replacements) = 'array'
        AND jsonb_array_length(proposed_replacements) <= 10
      );
  END IF;
END $$;

-- 5. RPC: Admin quick-approve a proposed tag into canonical tags
-- Creates canonical tag if not exists, and associates it with project in project_tags
CREATE OR REPLACE FUNCTION public.admin_approve_proposed_tag(
  p_project_id UUID,
  p_tag_name TEXT,
  p_tag_slug TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tag_id UUID;
  v_clean_name TEXT;
  v_clean_slug TEXT;
BEGIN
  IF NOT (SELECT public.is_communitycraft_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  v_clean_name := trim(p_tag_name);
  v_clean_slug := trim(lower(p_tag_slug));

  IF length(v_clean_name) < 2 OR length(v_clean_name) > 50 THEN
    RAISE EXCEPTION 'Tag name must be between 2 and 50 characters' USING ERRCODE = '22023';
  END IF;

  IF length(v_clean_slug) < 2 OR length(v_clean_slug) > 50 THEN
    RAISE EXCEPTION 'Tag slug must be between 2 and 50 characters' USING ERRCODE = '22023';
  END IF;

  -- Insert tag into canonical tags table if missing, or retrieve existing id
  INSERT INTO public.tags (name, slug, is_active, is_official)
  VALUES (v_clean_name, v_clean_slug, true, false)
  ON CONFLICT (slug) DO UPDATE
    SET is_active = true
  RETURNING id INTO v_tag_id;

  -- Associate tag with project in project_tags
  INSERT INTO public.project_tags (project_id, tag_id)
  VALUES (p_project_id, v_tag_id)
  ON CONFLICT DO NOTHING;

  -- Remove approved tag from proposed_tags array on the project
  UPDATE public.projects
  SET proposed_tags = array_remove(proposed_tags, v_clean_name),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_proposed_tag(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_proposed_tag(UUID, TEXT, TEXT) TO authenticated;

-- 6. RPC: Admin quick-approve a proposed replacement application
-- Creates application in applications table if missing, and creates entry in project_replacements
CREATE OR REPLACE FUNCTION public.admin_approve_proposed_application(
  p_project_id UUID,
  p_app_name TEXT,
  p_app_slug TEXT,
  p_level TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_app_id UUID;
  v_clean_name TEXT;
  v_clean_slug TEXT;
BEGIN
  IF NOT (SELECT public.is_communitycraft_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  v_clean_name := trim(p_app_name);
  v_clean_slug := trim(lower(p_app_slug));

  IF length(v_clean_name) < 2 OR length(v_clean_name) > 80 THEN
    RAISE EXCEPTION 'Application name must be between 2 and 80 characters' USING ERRCODE = '22023';
  END IF;

  IF length(v_clean_slug) < 2 OR length(v_clean_slug) > 80 THEN
    RAISE EXCEPTION 'Application slug must be between 2 and 80 characters' USING ERRCODE = '22023';
  END IF;

  IF p_level NOT IN ('Complete', 'Partial', 'Specialized') THEN
    RAISE EXCEPTION 'Invalid replacement level' USING ERRCODE = '22023';
  END IF;

  -- Insert application into applications table if missing
  INSERT INTO public.applications (name, slug)
  VALUES (v_clean_name, v_clean_slug)
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_app_id
  FROM public.applications
  WHERE slug = v_clean_slug;

  -- Create project replacement link
  INSERT INTO public.project_replacements (project_id, application_id, replacement_level)
  VALUES (p_project_id, v_app_id, p_level)
  ON CONFLICT (project_id, application_id) DO UPDATE
    SET replacement_level = p_level;

  -- Remove approved replacement from proposed_replacements JSONB array on the project
  UPDATE public.projects
  SET proposed_replacements = (
    SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
    FROM jsonb_array_elements(proposed_replacements) AS elem
    WHERE lower(elem->>'name') <> lower(v_clean_name)
  ),
  updated_at = timezone('utc'::text, now())
  WHERE id = p_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_proposed_application(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_proposed_application(UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMIT;
