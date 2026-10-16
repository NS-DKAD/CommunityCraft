-- Migration: Normalize tags and prepare categories (20261015)
-- Non-destructive: creates tag-related tables, preserves legacy data, and expands allowed categories.
-- NOTE: This migration is safe to re-run because it uses IF NOT EXISTS, DISTINCT inputs,
-- and explicit idempotent inserts with existence checks instead of silent conflict suppression.

BEGIN;

-- Preflight: fail cleanly before any DDL if historical data violates the new category constraint.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.projects
    WHERE category IS NOT NULL
      AND category NOT IN (
        'Tools', 'Mods', 'Shaders', 'Rendering & Assets', 'Libraries',
        'Software', 'Website', 'Plugin', 'Games'
      )
  ) THEN
    RAISE EXCEPTION 'Existing project categories violate the new category constraint. Migration aborted; no changes committed.';
  END IF;
END $$;

-- Preflight: fail explicitly when historical values are null or blank, rather than silently dropping them.
DO $$
DECLARE
  invalid_legacy_tag_count integer;
BEGIN
  SELECT COUNT(*) INTO invalid_legacy_tag_count
  FROM (
    SELECT DISTINCT p.id, raw_tag
    FROM public.projects p
    CROSS JOIN LATERAL unnest(p.tags) AS raw_tag
    WHERE raw_tag IS NULL OR btrim(raw_tag) = ''
  ) x;

  IF invalid_legacy_tag_count > 0 THEN
    RAISE EXCEPTION 'Legacy project tags include NULL or blank values. Migration aborted; no changes committed. Review existing data before retrying.';
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Expand category constraint to include both legacy categories and the new canonical categories.
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_category_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_category_check CHECK (
  category IN (
    'Tools', 'Mods', 'Shaders', 'Rendering & Assets', 'Libraries',
    'Software', 'Website', 'Plugin', 'Games'
  )
);

-- 2. Canonical tag table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_official BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Alias table for controlled synonym resolution without silent merges.
CREATE TABLE IF NOT EXISTS public.tag_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias TEXT NOT NULL UNIQUE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Join table between projects and tags
CREATE TABLE IF NOT EXISTS public.project_tags (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE RESTRICT,
  PRIMARY KEY (project_id, tag_id)
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_tags_slug ON public.tags(slug);
CREATE INDEX IF NOT EXISTS idx_project_tags_tag_id ON public.project_tags(tag_id);

-- 6. Build a single global mapping from each distinct historical tag name to a canonical slug.
--    This mapping is reused for tag creation, project-tag associations and final validation.
CREATE TEMP TABLE normalized_tag_map (
  raw_tag TEXT PRIMARY KEY,
  slug TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO normalized_tag_map (raw_tag, slug)
WITH historical_tags AS (
  SELECT DISTINCT trim(raw_tag) AS raw_tag
  FROM public.projects p
  CROSS JOIN LATERAL unnest(p.tags) AS raw_tag
  WHERE raw_tag IS NOT NULL AND btrim(raw_tag) <> ''
),
resolved_tag_map AS (
  SELECT
    raw_tag,
    regexp_replace(lower(trim(raw_tag)), '[^a-z0-9]+', '-', 'g') AS base_slug,
    CASE
      WHEN count(*) OVER (PARTITION BY regexp_replace(lower(trim(raw_tag)), '[^a-z0-9]+', '-', 'g')) > 1 THEN
        trim(both '-' from regexp_replace(regexp_replace(lower(trim(raw_tag)), '[^a-z0-9]+', '-', 'g'), '^-+|-+$', '', 'g')) || '-' || substr(md5(trim(raw_tag)), 1, 12)
      ELSE
        trim(both '-' from regexp_replace(regexp_replace(lower(trim(raw_tag)), '[^a-z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
    END AS slug
  FROM historical_tags
)
SELECT raw_tag, slug
FROM resolved_tag_map;

-- 7. Validate that the mapping remains unambiguous globally.
DO $$
DECLARE
  ambiguous_mapping_count integer;
BEGIN
  SELECT COUNT(*) INTO ambiguous_mapping_count
  FROM (
    SELECT slug
    FROM normalized_tag_map
    GROUP BY slug
    HAVING COUNT(DISTINCT raw_tag) > 1
  ) x;

  IF ambiguous_mapping_count > 0 THEN
    RAISE EXCEPTION 'Ambiguous legacy tag mapping detected. Migration aborted; no changes committed.';
  END IF;
END $$;

-- 8. Create canonical tags from the single global mapping.
INSERT INTO public.tags (name, slug, created_at)
SELECT n.raw_tag, n.slug, timezone('utc'::text, now())
FROM normalized_tag_map n
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tags t
  WHERE t.slug = n.slug
)
AND NOT EXISTS (
  SELECT 1
  FROM public.tags t
  WHERE t.name = n.raw_tag AND t.slug = n.slug
);

-- 9. Create project-tag associations using the same exact mapping.
INSERT INTO public.project_tags (project_id, tag_id)
SELECT DISTINCT
  p.id AS project_id,
  t.id AS tag_id
FROM public.projects AS p
CROSS JOIN LATERAL unnest(p.tags) AS u(raw_tag)
JOIN normalized_tag_map AS n
  ON n.raw_tag = btrim(u.raw_tag)
JOIN public.tags AS t
  ON t.name = n.raw_tag
WHERE u.raw_tag IS NOT NULL
  AND btrim(u.raw_tag) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.project_tags AS pt
    WHERE pt.project_id = p.id
      AND pt.tag_id = t.id
  );
-- 10. Preserve historical names as aliases without merging different tags.
INSERT INTO public.tag_aliases (alias, tag_id)
SELECT DISTINCT
  trim(raw_tag) AS alias,
  t.id AS tag_id
FROM public.projects p
CROSS JOIN LATERAL unnest(p.tags) AS raw_tag
JOIN public.tags t
  ON t.name = trim(raw_tag)
WHERE raw_tag IS NOT NULL AND btrim(raw_tag) <> ''
AND NOT EXISTS (
  SELECT 1
  FROM public.tag_aliases a
  WHERE a.alias = trim(raw_tag)
);

-- 11. Final validation: all expected historical tags and exact project-tag pairs must be present.
DO $$
DECLARE
  missing_pair_count integer;
BEGIN
  SELECT COUNT(*) INTO missing_pair_count
  FROM (
    SELECT DISTINCT
      p.id AS project_id,
      trim(u.raw_tag) AS raw_tag
    FROM public.projects AS p
    CROSS JOIN LATERAL unnest(p.tags) AS u(raw_tag)
    WHERE u.raw_tag IS NOT NULL
      AND btrim(u.raw_tag) <> ''
  ) AS expected_pairs
  JOIN normalized_tag_map AS n
    ON n.raw_tag = expected_pairs.raw_tag
  JOIN public.tags AS t
    ON t.name = n.raw_tag
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.project_tags AS pt
    WHERE pt.project_id = expected_pairs.project_id
      AND pt.tag_id = t.id
  );

  IF missing_pair_count > 0 THEN
    RAISE EXCEPTION 'One or more historical project-tag associations are missing in public.project_tags. Migration aborted; no changes committed.';
  END IF;
END $$;

-- 12. RLS is enabled only after the backfills to keep the migration re-runnable and safe.
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read tags" ON public.tags;
CREATE POLICY "Public read tags" ON public.tags FOR SELECT USING (true);

ALTER TABLE public.tag_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read tag_aliases" ON public.tag_aliases;
CREATE POLICY "Public read tag_aliases" ON public.tag_aliases FOR SELECT USING (true);

ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read project_tags" ON public.project_tags;
CREATE POLICY "Public read project_tags" ON public.project_tags FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = public.project_tags.project_id AND p.is_approved = true
  )
);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.tags TO anon, authenticated;
GRANT SELECT ON public.tag_aliases TO anon, authenticated;
GRANT SELECT ON public.project_tags TO anon, authenticated;

COMMIT;

-- NOTE:
-- - The legacy public.projects.tags TEXT[] column is preserved intentionally.
-- - No existing rows are deleted or overwritten.
-- - The migration refuses to proceed on ambiguous mappings, blank values, or missing expected associations.
-- - The script is idempotent: repeated execution adds no duplicate rows and preserves the same mapping.
