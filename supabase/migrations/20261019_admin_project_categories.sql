-- Database-managed category catalog. Projects keep their existing TEXT category
-- values so this migration does not rewrite historical project rows.
-- Requires 20261017_secure_admin_panel.sql (admin allowlist and RPC foundation).
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.projects') IS NULL
     OR to_regprocedure('public.is_communitycraft_admin()') IS NULL THEN
    RAISE EXCEPTION 'Category migration requires projects and the admin allowlist function.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.projects
    WHERE category IS NULL OR btrim(category) = '' OR category = 'By ArtCraft'
       OR category NOT IN ('Tools','Mods','Shaders','Rendering & Assets','Libraries','Software','Website','Plugin','Games')
  ) THEN
    RAISE EXCEPTION 'Category migration stopped: existing project categories include a blank, reserved, or unreviewed value. Inspect SELECT category, count(*) FROM public.projects GROUP BY category before retrying; no data was changed.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.project_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT project_categories_not_editorial_check CHECK (lower(btrim(name)) <> 'by artcraft'),
  CONSTRAINT project_categories_display_name_check CHECK (display_name IS NULL OR length(btrim(display_name)) BETWEEN 1 AND 60),
  CONSTRAINT project_categories_color_check CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$')
);

DO $$
DECLARE
  required_column TEXT;
  required_type TEXT;
BEGIN
  FOR required_column, required_type IN
    SELECT * FROM (VALUES
      ('id','uuid'), ('name','text'), ('slug','text'), ('display_name','text'),
      ('color','text'), ('is_active','boolean'), ('sort_order','integer'),
      ('created_at','timestamp with time zone'), ('updated_at','timestamp with time zone')
    ) AS required(column_name, data_type)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='project_categories'
        AND column_name=required_column AND data_type=required_type
    ) THEN
      RAISE EXCEPTION 'Category migration stopped: public.project_categories.%.% is missing or has an incompatible type.', required_column, required_type;
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='project_categories'
      AND column_name IN ('id','name','slug','is_active','sort_order','created_at','updated_at')
      AND is_nullable <> 'NO'
  ) THEN
    RAISE EXCEPTION 'Category migration stopped: required category identity/state columns must be NOT NULL.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.project_categories'::regclass AND contype='p') THEN
    RAISE EXCEPTION 'Category migration stopped: public.project_categories must have a primary key.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.project_categories WHERE lower(btrim(name))='by artcraft')
     OR EXISTS (SELECT 1 FROM public.project_categories WHERE display_name IS NOT NULL AND length(btrim(display_name)) NOT BETWEEN 1 AND 60)
     OR EXISTS (SELECT 1 FROM public.project_categories WHERE color IS NOT NULL AND color !~ '^#[0-9A-Fa-f]{6}$') THEN
    RAISE EXCEPTION 'Category migration stopped: existing category catalog values violate reserved-name or presentation rules.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_categories_name_ci ON public.project_categories(lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_categories_slug ON public.project_categories(slug);
CREATE INDEX IF NOT EXISTS idx_project_categories_active_order ON public.project_categories(is_active, sort_order, name);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='project_categories_not_editorial_check' AND conrelid='public.project_categories'::regclass) THEN
    ALTER TABLE public.project_categories ADD CONSTRAINT project_categories_not_editorial_check CHECK (lower(btrim(name)) <> 'by artcraft');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='project_categories_display_name_check' AND conrelid='public.project_categories'::regclass) THEN
    ALTER TABLE public.project_categories ADD CONSTRAINT project_categories_display_name_check CHECK (display_name IS NULL OR length(btrim(display_name)) BETWEEN 1 AND 60);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='project_categories_color_check' AND conrelid='public.project_categories'::regclass) THEN
    ALTER TABLE public.project_categories ADD CONSTRAINT project_categories_color_check CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
END $$;

-- Preserve the prior database-supported categories without making the legacy
-- values available to new submissions. The five current MVP categories are active.
INSERT INTO public.project_categories(name, slug, is_active, sort_order) VALUES
  ('Software','software',true,10),
  ('Website','website',true,20),
  ('Plugin','plugin',true,30),
  ('Games','games',true,40),
  ('Mods','mods',true,50),
  ('Tools','tools',false,100),
  ('Shaders','shaders',false,110),
  ('Rendering & Assets','rendering-assets',false,120),
  ('Libraries','libraries',false,130)
ON CONFLICT (slug) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT required.name, required.slug FROM (VALUES
      ('Software','software'), ('Website','website'), ('Plugin','plugin'), ('Games','games'), ('Mods','mods'),
      ('Tools','tools'), ('Shaders','shaders'), ('Rendering & Assets','rendering-assets'), ('Libraries','libraries')
    ) AS required(name, slug)
    WHERE NOT EXISTS (SELECT 1 FROM public.project_categories c WHERE c.name=required.name AND c.slug=required.slug)
  ) THEN
    RAISE EXCEPTION 'Category migration stopped: an existing catalog entry conflicts with a seeded canonical category. No project data was changed.';
  END IF;
END $$;

-- The project category remains TEXT; this trigger prevents storing values that
-- are not in the controlled catalog while preserving inactive historical rows.
CREATE OR REPLACE FUNCTION public.validate_project_category_catalog()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.project_categories c WHERE c.name = NEW.category) THEN
    RAISE EXCEPTION 'Unknown project category' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trigger_validate_project_category_catalog ON public.projects;
CREATE TRIGGER trigger_validate_project_category_catalog
  BEFORE INSERT OR UPDATE OF category ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.validate_project_category_catalog();
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_category_check;

ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_categories FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.project_categories TO anon, authenticated;
GRANT SELECT ON public.project_categories TO service_role;
DROP POLICY IF EXISTS "Public reads usable project categories" ON public.project_categories;
CREATE POLICY "Public reads usable project categories" ON public.project_categories
  FOR SELECT TO anon, authenticated
  USING (
    is_active OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.is_approved = true AND p.category = project_categories.name
    )
  );
DROP POLICY IF EXISTS "Admins read all project categories" ON public.project_categories;
CREATE POLICY "Admins read all project categories" ON public.project_categories
  FOR SELECT TO authenticated
  USING ((SELECT public.is_communitycraft_admin()));

CREATE OR REPLACE FUNCTION public.admin_create_project_category(
  p_name TEXT,
  p_slug TEXT,
  p_display_name TEXT,
  p_color TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT (SELECT public.is_communitycraft_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 2 AND 50
     OR btrim(p_name) !~ '^[[:alnum:]][[:alnum:] .&+_-]*$'
     OR lower(btrim(p_name)) = 'by artcraft'
     OR p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     OR (p_display_name IS NOT NULL AND length(btrim(p_display_name)) NOT BETWEEN 1 AND 60)
     OR (p_color IS NOT NULL AND p_color !~ '^#[0-9A-Fa-f]{6}$') THEN
    RAISE EXCEPTION 'Category details failed database validation' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.project_categories(name, slug, display_name, color, is_active)
  VALUES (btrim(p_name), p_slug, nullif(btrim(p_display_name), ''), upper(p_color), true)
  RETURNING id INTO new_id;
  RETURN new_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'A category with that name or slug already exists' USING ERRCODE = '23505';
END;
$$;
REVOKE ALL ON FUNCTION public.admin_create_project_category(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_project_category(TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_project_category_presentation(
  p_category_id UUID,
  p_display_name TEXT,
  p_color TEXT,
  p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT (SELECT public.is_communitycraft_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF (p_display_name IS NOT NULL AND length(btrim(p_display_name)) NOT BETWEEN 1 AND 60)
     OR (p_color IS NOT NULL AND p_color !~ '^#[0-9A-Fa-f]{6}$') OR p_is_active IS NULL THEN
    RAISE EXCEPTION 'Category presentation failed database validation' USING ERRCODE = '22023';
  END IF;
  UPDATE public.project_categories
  SET display_name = nullif(btrim(p_display_name), ''), color = upper(p_color),
      is_active = p_is_active, updated_at = timezone('utc'::text, now())
  WHERE id = p_category_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Category not found' USING ERRCODE = 'P0002'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_project_category_presentation(UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_project_category_presentation(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;

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
DECLARE old_state JSONB; new_state JSONB;
BEGIN
  IF NOT (SELECT public.is_communitycraft_admin()) THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501'; END IF;
  IF p_moderation_status NOT IN ('pending', 'approved', 'rejected') THEN RAISE EXCEPTION 'Invalid moderation status' USING ERRCODE = '22023'; END IF;
  IF jsonb_typeof(p_fields) <> 'object'
     OR p_fields - ARRAY['name','author_name','description','category','goal','status','github_url','website_url','discussion_url'] <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid project fields' USING ERRCODE = '22023';
  END IF;
  IF length(trim(coalesce(p_fields->>'name',''))) NOT BETWEEN 2 AND 100
     OR length(trim(coalesce(p_fields->>'author_name',''))) NOT BETWEEN 2 AND 80
     OR length(trim(coalesce(p_fields->>'description',''))) NOT BETWEEN 20 AND 5000
     OR NOT EXISTS (SELECT 1 FROM public.project_categories c WHERE c.name = p_fields->>'category')
     OR coalesce(p_fields->>'status','') NOT IN ('Proposed','Seeking collaborators','In development','Completed','Inactive') THEN
    RAISE EXCEPTION 'Project fields failed database validation' USING ERRCODE = '22023';
  END IF;
  SELECT jsonb_build_object('name', p.name, 'author_name', p.author_name, 'description', p.description,
    'category', p.category, 'goal', p.goal, 'status', p.status, 'github_url', p.github_url,
    'website_url', p.website_url, 'discussion_url', p.discussion_url, 'moderation_status', p.moderation_status)
  INTO old_state FROM public.projects p WHERE p.id = p_project_id FOR UPDATE;
  IF old_state IS NULL THEN RAISE EXCEPTION 'Project not found' USING ERRCODE = 'P0002'; END IF;
  UPDATE public.projects SET name=trim(p_fields->>'name'), author_name=trim(p_fields->>'author_name'),
    description=trim(p_fields->>'description'), category=p_fields->>'category', goal=nullif(trim(p_fields->>'goal'), ''),
    status=p_fields->>'status', github_url=nullif(trim(p_fields->>'github_url'), ''),
    website_url=nullif(trim(p_fields->>'website_url'), ''), discussion_url=nullif(trim(p_fields->>'discussion_url'), ''),
    moderation_status=p_moderation_status, is_approved=(p_moderation_status='approved'), updated_at=timezone('utc'::text, now())
  WHERE id=p_project_id;
  SELECT jsonb_build_object('name', p.name, 'author_name', p.author_name, 'description', p.description,
    'category', p.category, 'goal', p.goal, 'status', p.status, 'github_url', p.github_url,
    'website_url', p.website_url, 'discussion_url', p.discussion_url, 'moderation_status', p.moderation_status)
  INTO new_state FROM public.projects p WHERE p.id=p_project_id;
  INSERT INTO public.moderation_events(actor_id, entity_type, entity_id, action, before_state, after_state)
  VALUES ((SELECT auth.uid()), 'project', p_project_id,
    CASE WHEN old_state->>'moderation_status' IS DISTINCT FROM p_moderation_status THEN 'project_moderated' ELSE 'project_edited' END,
    old_state, new_state);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_save_project(UUID, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_project(UUID, JSONB, TEXT) TO authenticated;

COMMENT ON TABLE public.project_categories IS 'Controlled project category catalog. Inactive historical entries preserve existing project.category values and are excluded from new public submissions.';
COMMENT ON COLUMN public.project_categories.slug IS 'Stable canonical slug; presentation editing does not change it.';

COMMIT;
