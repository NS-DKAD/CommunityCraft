-- CommunityCraft Database Schema for Supabase (PostgreSQL)
-- Migration: 20261014_init_communitycraft_schema.sql

-- 1. Enable pgcrypto / uuid extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Projects table (manually submitted and verified project information)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  author_name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('Tools', 'Mods', 'Shaders', 'Rendering & Assets', 'Libraries')
  ),
  tags TEXT[] NOT NULL DEFAULT '{}',
  github_url TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Project GitHub Stats table (isolated from manual project information)
-- Keeps automated / cached GitHub stats separate from user-entered project metadata
CREATE TABLE IF NOT EXISTS public.project_github_stats (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL DEFAULT 0,
  forks INTEGER NOT NULL DEFAULT 0,
  open_issues INTEGER NOT NULL DEFAULT 0,
  license TEXT DEFAULT 'MIT',
  default_branch TEXT DEFAULT 'main',
  last_github_commit_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_projects_category ON public.projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_tags ON public.projects USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_projects_approved ON public.projects(is_approved);
CREATE INDEX IF NOT EXISTS idx_project_stats_stars ON public.project_github_stats(stars DESC);

-- 5. Automatic updated_at trigger for projects
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON public.projects;
CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 6. Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_github_stats ENABLE ROW LEVEL SECURITY;

-- Allow anonymous & authenticated users to read approved projects
DROP POLICY IF EXISTS "Public read approved projects" ON public.projects;
CREATE POLICY "Public read approved projects"
  ON public.projects FOR SELECT
  USING (is_approved = true);

-- Allow anonymous & authenticated users to read GitHub statistics
DROP POLICY IF EXISTS "Public read project stats" ON public.project_github_stats;
CREATE POLICY "Public read project stats"
  ON public.project_github_stats FOR SELECT
  USING (true);

-- 7. View for easy querying with joined GitHub statistics
CREATE OR REPLACE VIEW public.projects_with_stats AS
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
  s.synced_at
FROM public.projects p
LEFT JOIN public.project_github_stats s ON p.id = s.project_id;
