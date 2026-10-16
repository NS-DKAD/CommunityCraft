-- CommunityCraft: controlled tag catalog additions (manual Supabase SQL Editor script)
-- Run only after reviewing this exact approved set. This is intentionally outside
-- supabase/migrations so it is not applied automatically by migration tooling.
-- Execute the entire script as one unit; if any statement raises an error, do not
-- continue or commit the transaction. Roll it back and review the reported conflict.
-- It inserts approved canonical tags/aliases and adds missing project_tags links
-- only for those explicit legacy values. It never edits projects.tags or deletes rows.

BEGIN;

-- Refuse to create a second spelling/slug variant for an existing canonical tag.
DO $$
DECLARE
  candidate RECORD;
  matching_rows integer;
  exact_rows integer;
BEGIN
  FOR candidate IN
    SELECT * FROM (VALUES
      ('3D Modeling', '3d-modeling'),
      ('CAD', 'cad'),
      ('BREP', 'brep'),
      ('STEP', 'step'),
      ('egui', 'egui'),
      ('WebAssembly', 'webassembly'),
      ('Web', 'web')
    ) AS approved(name, slug)
  LOOP
    SELECT count(*) INTO matching_rows
    FROM public.tags
    WHERE lower(btrim(name)) = lower(candidate.name)
       OR lower(btrim(slug)) = lower(candidate.slug);

    SELECT count(*) INTO exact_rows
    FROM public.tags
    WHERE name = candidate.name AND slug = candidate.slug;

    IF matching_rows > 1 OR (matching_rows = 1 AND exact_rows <> 1) THEN
      RAISE EXCEPTION
        'Tag approval stopped: name/slug conflict for canonical tag "%" (slug "%"). No changes committed.',
        candidate.name, candidate.slug;
    END IF;

    IF matching_rows = 1 AND EXISTS (
      SELECT 1
      FROM public.tags
      WHERE name = candidate.name
        AND slug = candidate.slug
        AND is_official
    ) THEN
      RAISE EXCEPTION
        'Tag approval stopped: canonical tag "%" is marked official and needs manual review.',
        candidate.name;
    END IF;
  END LOOP;
END $$;

INSERT INTO public.tags AS current_tag (name, slug, is_active, is_official)
VALUES
  ('3D Modeling', '3d-modeling', true, false),
  ('CAD', 'cad', true, false),
  ('BREP', 'brep', true, false),
  ('STEP', 'step', true, false),
  ('egui', 'egui', true, false),
  ('WebAssembly', 'webassembly', true, false),
  ('Web', 'web', true, false)
ON CONFLICT (slug) DO UPDATE
SET is_active = true,
    updated_at = timezone('utc'::text, now())
WHERE current_tag.name = EXCLUDED.name
  AND NOT current_tag.is_active;

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.tags
    WHERE (name, slug) IN (
      ('3D Modeling', '3d-modeling'),
      ('CAD', 'cad'),
      ('BREP', 'brep'),
      ('STEP', 'step'),
      ('egui', 'egui'),
      ('WebAssembly', 'webassembly'),
      ('Web', 'web')
    )
  ) <> 7 THEN
    RAISE EXCEPTION 'Tag approval stopped: all seven canonical tags were not present after insertion.';
  END IF;
END $$;

-- Only these two aliases were explicitly approved. Refuse aliases already owned
-- by another canonical tag or colliding with another canonical name/slug.
DO $$
DECLARE
  candidate RECORD;
  target_id uuid;
BEGIN
  FOR candidate IN
    SELECT * FROM (VALUES
      ('3d-modeling', '3d-modeling'),
      ('wasm', 'webassembly')
    ) AS approved(alias, canonical_slug)
  LOOP
    SELECT id INTO target_id
    FROM public.tags
    WHERE slug = candidate.canonical_slug;

    IF target_id IS NULL THEN
      RAISE EXCEPTION 'Tag approval stopped: canonical target "%" is missing.', candidate.canonical_slug;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.tag_aliases AS a
      WHERE lower(btrim(a.alias)) = lower(candidate.alias)
        AND a.tag_id <> target_id
    ) OR EXISTS (
      SELECT 1
      FROM public.tags AS t
      WHERE (lower(btrim(t.name)) = lower(candidate.alias)
          OR lower(btrim(t.slug)) = lower(candidate.alias))
        AND t.id <> target_id
    ) THEN
      RAISE EXCEPTION 'Tag approval stopped: alias "%" conflicts with another canonical tag.', candidate.alias;
    END IF;
  END LOOP;
END $$;

WITH approved_aliases(alias, canonical_slug) AS (
  VALUES
    ('3d-modeling', '3d-modeling'),
    ('wasm', 'webassembly')
)
INSERT INTO public.tag_aliases (alias, tag_id)
SELECT approved_aliases.alias, t.id
FROM approved_aliases
JOIN public.tags AS t ON t.slug = approved_aliases.canonical_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tag_aliases AS existing
  WHERE lower(btrim(existing.alias)) = lower(approved_aliases.alias)
);

-- Add links for legacy values matching only this approved set, without changing
-- or removing any existing project_tags associations.
INSERT INTO public.project_tags (project_id, tag_id)
SELECT DISTINCT p.id, t.id
FROM public.projects AS p
CROSS JOIN LATERAL unnest(coalesce(p.tags, ARRAY[]::text[])) AS legacy(raw_tag)
JOIN public.tags AS t
  ON t.slug IN ('3d-modeling', 'cad', 'brep', 'step', 'egui', 'webassembly', 'web')
WHERE legacy.raw_tag IS NOT NULL
  AND btrim(legacy.raw_tag) <> ''
  AND (
    lower(btrim(legacy.raw_tag)) = lower(btrim(t.name))
    OR lower(btrim(legacy.raw_tag)) = lower(btrim(t.slug))
    OR EXISTS (
      SELECT 1
      FROM public.tag_aliases AS a
      WHERE a.tag_id = t.id
        AND lower(btrim(a.alias)) = lower(btrim(legacy.raw_tag))
    )
  )
ON CONFLICT (project_id, tag_id) DO NOTHING;

COMMIT;
