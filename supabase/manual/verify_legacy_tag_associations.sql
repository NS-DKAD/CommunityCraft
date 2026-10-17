-- Read-only verification after approve_validated_tags.sql.
-- Expected result: ASSOCIATED for approved matches; UNCATALOGUED for values
-- intentionally left outside the approved catalog; no ambiguous or missing links.
WITH legacy_pairs AS (
  SELECT
    p.id AS project_id,
    p.name AS project_name,
    lower(btrim(u.raw_tag)) AS tag_key,
    min(btrim(u.raw_tag)) AS legacy_tag
  FROM public.projects AS p
  CROSS JOIN LATERAL unnest(coalesce(p.tags, ARRAY[]::text[])) AS u(raw_tag)
  WHERE u.raw_tag IS NOT NULL AND btrim(u.raw_tag) <> ''
  GROUP BY p.id, p.name, lower(btrim(u.raw_tag))
), candidate_tags AS (
  SELECT lp.project_id, lp.tag_key, t.id AS tag_id
  FROM legacy_pairs AS lp
  JOIN public.tags AS t ON lower(btrim(t.name)) = lp.tag_key

  UNION

  SELECT lp.project_id, lp.tag_key, t.id AS tag_id
  FROM legacy_pairs AS lp
  JOIN public.tags AS t ON lower(btrim(t.slug)) = lp.tag_key

  UNION

  SELECT lp.project_id, lp.tag_key, t.id AS tag_id
  FROM legacy_pairs AS lp
  JOIN public.tag_aliases AS a ON lower(btrim(a.alias)) = lp.tag_key
  JOIN public.tags AS t ON t.id = a.tag_id
), resolved AS (
  SELECT
    lp.project_id,
    lp.project_name,
    lp.tag_key,
    lp.legacy_tag,
    count(DISTINCT ct.tag_id)::integer AS candidate_count,
    min(ct.tag_id::text) AS candidate_tag_id
  FROM legacy_pairs AS lp
  LEFT JOIN candidate_tags AS ct
    ON ct.project_id = lp.project_id AND ct.tag_key = lp.tag_key
  GROUP BY lp.project_id, lp.project_name, lp.tag_key, lp.legacy_tag
), classified AS (
  SELECT
    r.*,
    CASE
      WHEN r.candidate_count = 0 THEN 'UNCATALOGUED'
      WHEN r.candidate_count > 1 THEN 'AMBIGUOUS'
      WHEN EXISTS (
        SELECT 1
        FROM public.project_tags AS pt
        WHERE pt.project_id = r.project_id
          AND pt.tag_id = r.candidate_tag_id::uuid
      ) THEN 'ASSOCIATED'
      ELSE 'MISSING_ASSOCIATION'
    END AS status
  FROM resolved AS r
)
SELECT status, project_id, project_name, legacy_tag, candidate_count
FROM classified
ORDER BY status, legacy_tag, project_name;
