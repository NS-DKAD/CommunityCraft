-- Reconcile legacy project.tags values only when they already map to a
-- moderator-approved canonical tag or an existing, explicit alias.
-- This migration intentionally does not create tags or aliases from free-form
-- legacy values. Unknown values remain in projects.tags for later moderation.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    WITH legacy_pairs AS (
      SELECT DISTINCT p.id AS project_id, lower(btrim(u.raw_tag)) AS tag_key
      FROM public.projects p
      CROSS JOIN LATERAL unnest(coalesce(p.tags, ARRAY[]::text[])) AS u(raw_tag)
      WHERE u.raw_tag IS NOT NULL AND btrim(u.raw_tag) <> ''
    ), candidate_pairs AS (
      SELECT lp.project_id, lp.tag_key, t.id AS tag_id
      FROM legacy_pairs lp
      JOIN public.tags t ON lower(btrim(t.name)) = lp.tag_key
      UNION
      SELECT lp.project_id, lp.tag_key, t.id AS tag_id
      FROM legacy_pairs lp
      JOIN public.tag_aliases a ON lower(btrim(a.alias)) = lp.tag_key
      JOIN public.tags t ON t.id = a.tag_id
    )
    SELECT 1
    FROM candidate_pairs
    GROUP BY project_id, tag_key
    HAVING count(DISTINCT tag_id) > 1
  ) THEN
    RAISE EXCEPTION 'Tag reconciliation stopped: a legacy tag resolves to multiple canonical tags. No changes were committed.';
  END IF;
END $$;

WITH legacy_pairs AS (
  SELECT DISTINCT p.id AS project_id, lower(btrim(u.raw_tag)) AS tag_key
  FROM public.projects p
  CROSS JOIN LATERAL unnest(coalesce(p.tags, ARRAY[]::text[])) AS u(raw_tag)
  WHERE u.raw_tag IS NOT NULL AND btrim(u.raw_tag) <> ''
), candidate_pairs AS (
  SELECT lp.project_id, t.id AS tag_id
  FROM legacy_pairs lp
  JOIN public.tags t ON lower(btrim(t.name)) = lp.tag_key
  UNION
  SELECT lp.project_id, t.id AS tag_id
  FROM legacy_pairs lp
  JOIN public.tag_aliases a ON lower(btrim(a.alias)) = lp.tag_key
  JOIN public.tags t ON t.id = a.tag_id
)
INSERT INTO public.project_tags (project_id, tag_id)
SELECT DISTINCT cp.project_id, cp.tag_id
FROM candidate_pairs cp
WHERE NOT EXISTS (
  SELECT 1
  FROM public.project_tags pt
  WHERE pt.project_id = cp.project_id AND pt.tag_id = cp.tag_id
)
ON CONFLICT (project_id, tag_id) DO NOTHING;

COMMIT;

-- Verify unresolved legacy values separately. They are intentionally not added
-- to the public catalog by this migration; moderators must approve each one.
