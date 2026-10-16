-- Read-only moderation check for the three named project records.
SELECT
  id,
  name,
  slug,
  is_approved,
  CASE WHEN is_approved THEN 'Approved' ELSE 'Pending / not approved' END AS moderation_state,
  status,
  created_at,
  updated_at
FROM public.projects
WHERE lower(btrim(name)) IN ('solidcraft', 'openplayground', 'test submit 2')
ORDER BY lower(name), created_at;
