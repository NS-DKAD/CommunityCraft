-- Allows allowlisted admins to change tag filter presentation without editing
-- canonical tag names/slugs or project-tag associations.
-- Requires the existing normalized tags schema and 20261017 admin functions.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.tags') IS NULL
     OR to_regprocedure('public.is_communitycraft_admin()') IS NULL THEN
    RAISE EXCEPTION 'Tag presentation migration requires public.tags and public.is_communitycraft_admin().';
  END IF;
END $$;

ALTER TABLE public.tags
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT;

DO $$
DECLARE
  display_type TEXT;
  color_type TEXT;
BEGIN
  SELECT data_type INTO display_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'display_name';
  SELECT data_type INTO color_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'color';
  IF display_type <> 'text' OR color_type <> 'text' THEN
    RAISE EXCEPTION 'Tag presentation migration stopped: tags.display_name and tags.color must be TEXT.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tags WHERE display_name IS NOT NULL AND length(btrim(display_name)) NOT BETWEEN 1 AND 60) THEN
    RAISE EXCEPTION 'Tag presentation migration stopped: an existing display_name is outside the allowed length.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tags WHERE color IS NOT NULL AND color !~ '^#[0-9A-Fa-f]{6}$') THEN
    RAISE EXCEPTION 'Tag presentation migration stopped: an existing color is not a six-digit hex color.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tags_display_name_length_check' AND conrelid = 'public.tags'::regclass) THEN
    ALTER TABLE public.tags ADD CONSTRAINT tags_display_name_length_check
      CHECK (display_name IS NULL OR length(btrim(display_name)) BETWEEN 1 AND 60);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tags_color_hex_check' AND conrelid = 'public.tags'::regclass) THEN
    ALTER TABLE public.tags ADD CONSTRAINT tags_color_hex_check
      CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_tag_presentation(
  p_tag_id UUID,
  p_display_name TEXT,
  p_color TEXT
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
  IF p_display_name IS NOT NULL AND length(btrim(p_display_name)) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'Display label must contain 1 to 60 characters' USING ERRCODE = '22023';
  END IF;
  IF p_color IS NOT NULL AND p_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Color must be a six-digit hex color' USING ERRCODE = '22023';
  END IF;
  UPDATE public.tags
  SET display_name = nullif(btrim(p_display_name), ''),
      color = upper(p_color),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_tag_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Canonical tag not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_tag_presentation(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_tag_presentation(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.admin_update_tag_presentation(UUID, TEXT, TEXT) IS
  'Allowlisted admin changes Discover presentation only; canonical tag name, slug, and associations are unchanged.';

COMMIT;
