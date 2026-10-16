-- Read-only preflight for the temporary "test" tag. No rows means there is
-- neither a canonical tag named/sluggified "test" nor an alias named "test".
SELECT
  'canonical' AS catalog_entry_type,
  t.id AS canonical_tag_id,
  t.name AS canonical_name,
  t.slug AS canonical_slug,
  NULL::text AS alias,
  t.is_active,
  count(DISTINCT pt.project_id) AS project_association_count,
  coalesce((
    SELECT string_agg(a.alias, ', ' ORDER BY a.alias)
    FROM public.tag_aliases AS a
    WHERE a.tag_id = t.id
  ), '') AS attached_aliases,
  coalesce(string_agg(DISTINCT pt.project_id::text, ', ' ORDER BY pt.project_id::text), '') AS associated_project_ids
FROM public.tags AS t
LEFT JOIN public.project_tags AS pt ON pt.tag_id = t.id
WHERE lower(btrim(t.name)) = 'test'
   OR lower(btrim(t.slug)) = 'test'
GROUP BY t.id, t.name, t.slug, t.is_active

UNION ALL

SELECT
  'alias' AS catalog_entry_type,
  t.id AS canonical_tag_id,
  t.name AS canonical_name,
  t.slug AS canonical_slug,
  a.alias,
  t.is_active,
  count(DISTINCT pt.project_id) AS project_association_count,
  coalesce((
    SELECT string_agg(all_aliases.alias, ', ' ORDER BY all_aliases.alias)
    FROM public.tag_aliases AS all_aliases
    WHERE all_aliases.tag_id = t.id
  ), '') AS attached_aliases,
  coalesce(string_agg(DISTINCT pt.project_id::text, ', ' ORDER BY pt.project_id::text), '') AS associated_project_ids
FROM public.tag_aliases AS a
JOIN public.tags AS t ON t.id = a.tag_id
LEFT JOIN public.project_tags AS pt ON pt.tag_id = t.id
WHERE lower(btrim(a.alias)) = 'test'
GROUP BY t.id, t.name, t.slug, a.alias, t.is_active
ORDER BY catalog_entry_type, canonical_name;
