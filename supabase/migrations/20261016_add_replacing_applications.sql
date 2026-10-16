-- Migration: add application catalog and project replacement relations (20261016)
-- This migration is intentionally versioned and safe to review before manual execution in Supabase.
-- It is not executed in this local workspace.

BEGIN;

-- Do not let CREATE TABLE IF NOT EXISTS silently accept an unrelated or older
-- applications table. Fail before changing schema or data and explain the repair path.
DO $$
DECLARE
  existing_kind "char";
  expected RECORD;
  actual_type TEXT;
  actual_nullable TEXT;
  actual_default TEXT;
BEGIN
  IF to_regclass('public.applications') IS NOT NULL THEN
    SELECT c.relkind INTO existing_kind
    FROM pg_class c
    WHERE c.oid = to_regclass('public.applications');
    IF existing_kind <> 'r' THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Replacing migration stopped: public.applications already exists but is not a table. No changes were made.';
    END IF;

    FOR expected IN
      SELECT * FROM (VALUES
        ('id', 'uuid', true, true),
        ('name', 'text', true, false),
        ('slug', 'text', true, false),
        ('description', 'text', false, false),
        ('created_at', 'timestamp with time zone', true, true),
        ('updated_at', 'timestamp with time zone', true, true)
      ) AS required(column_name, data_type, must_be_not_null, must_have_default)
    LOOP
      SELECT c.data_type, c.is_nullable, c.column_default INTO actual_type, actual_nullable, actual_default
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = 'applications'
        AND c.column_name = expected.column_name;

      IF actual_type IS DISTINCT FROM expected.data_type
         OR (expected.must_be_not_null AND actual_nullable IS DISTINCT FROM 'NO')
         OR (NOT expected.must_be_not_null AND actual_nullable IS DISTINCT FROM 'YES')
         OR (expected.must_have_default AND actual_default IS NULL) THEN
        RAISE EXCEPTION USING
          ERRCODE = '55000',
          MESSAGE = format(
            'Replacing migration stopped: public.applications.%s has an incompatible schema (expected %s%s). No changes were made.',
            expected.column_name,
            expected.data_type,
            CASE WHEN expected.must_be_not_null THEN ' NOT NULL' ELSE ' NULLABLE' END
              || CASE WHEN expected.must_have_default THEN ' with a default' ELSE '' END
          ),
          HINT = 'Back up and review the existing table manually, then reconcile it with the Replacing schema before rerunning this migration. The migration will not alter or delete existing data.';
      END IF;
    END LOOP;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = 'applications'
        AND c.is_nullable = 'NO'
        AND c.column_default IS NULL
        AND c.is_identity = 'NO'
        AND c.is_generated = 'NEVER'
        AND c.column_name NOT IN ('id', 'name', 'slug', 'created_at', 'updated_at')
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Replacing migration stopped: public.applications has an additional required column without a default. No changes were made.',
        HINT = 'Review the extra column manually; the Replacing catalog seed and app inserts cannot provide it. No existing data has been altered.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.applications
      GROUP BY lower(name) HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Replacing migration stopped: public.applications contains names that differ only by letter case. No changes were made.',
        HINT = 'Review and reconcile duplicate application names manually before rerunning the migration.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.applications
      GROUP BY id HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Replacing migration stopped: public.applications contains duplicate IDs. No changes were made.',
        HINT = 'Review and reconcile duplicate application IDs manually before rerunning the migration.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.applications
      GROUP BY slug HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Replacing migration stopped: public.applications contains duplicate slugs. No changes were made.',
        HINT = 'Review and reconcile duplicate application slugs manually before rerunning the migration.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.applications
      WHERE lower(name) = 'photoshop' AND slug <> 'photoshop'
    ) OR EXISTS (
      SELECT 1 FROM public.applications
      WHERE slug = 'photoshop' AND lower(name) <> 'photoshop'
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Replacing migration stopped: the reserved Photoshop name or slug conflicts with an existing catalog entry. No changes were made.',
        HINT = 'Review the existing Photoshop catalog entry manually before rerunning the migration.';
    END IF;
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_id
  ON public.applications (id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_name_ci
  ON public.applications (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_slug
  ON public.applications (slug);

-- Include the application used in the product example; future catalog additions
-- remain moderator-controlled and can be made without creating case variants.
INSERT INTO public.applications (name, slug)
SELECT 'Photoshop', 'photoshop'
WHERE NOT EXISTS (
  SELECT 1 FROM public.applications WHERE lower(name) = lower('Photoshop')
);

CREATE TABLE IF NOT EXISTS public.project_replacements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE RESTRICT,
  replacement_level TEXT NOT NULL CHECK (replacement_level IN ('Complete', 'Partial', 'Specialized')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (project_id, application_id)
);

CREATE INDEX IF NOT EXISTS idx_project_replacements_project_id ON public.project_replacements(project_id);
CREATE INDEX IF NOT EXISTS idx_project_replacements_application_id ON public.project_replacements(application_id);

CREATE OR REPLACE FUNCTION public.handle_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_applications_updated_at ON public.applications;
CREATE TRIGGER trigger_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_applications_updated_at();

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_replacements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read applications" ON public.applications;
CREATE POLICY "Public read applications"
  ON public.applications FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read project replacements" ON public.project_replacements;
CREATE POLICY "Public read project replacements"
  ON public.project_replacements FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = public.project_replacements.project_id
        AND p.is_approved = true
    )
  );

GRANT USAGE ON SCHEMA public TO anon, authenticated;
REVOKE ALL ON public.applications FROM anon, authenticated;
REVOKE ALL ON public.project_replacements FROM anon, authenticated;
GRANT SELECT ON public.applications TO anon, authenticated;
GRANT SELECT ON public.project_replacements TO anon, authenticated;

COMMIT;

-- Manual Supabase step:
-- 1. Run this migration in the Supabase SQL editor.
-- 2. Keep the legacy projects.tags column in place.
-- 3. The form can select only existing applications. Add future catalog entries through
--    moderator-reviewed SQL/admin tooling; public clients receive SELECT only.
