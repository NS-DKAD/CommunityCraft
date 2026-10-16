# CommunityCraft

Open-source community directory and collaboration hub for creations related to the **ArtCraft** ecosystem.

CommunityCraft helps people discover projects, understand their status, and find collaborators. It indexes project information; project files and source code remain hosted by their creators, primarily on GitHub.

> **Independence notice:** CommunityCraft is an independent project and must not imply official ArtCraft status without authorization. Official or verified labels are reserved for authorized moderators.

## Quick start (Windows)

### Prerequisites
- Node.js (LTS recommended)
- Git for Windows

### Start the development server
Open PowerShell in the project directory and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Verification

Run the checks relevant to your change:

```bash
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npm run build
```

Use the test command only if the test script is available in the current checkout. Do not report a check as successful unless its command completed successfully.

## Database and migrations

The application uses Supabase/PostgreSQL. SQL migrations are stored in `supabase/migrations/`.

The migration `20261015_normalize_tags_and_categories.sql` introduces normalized `tags`, `tag_aliases`, and `project_tags` tables and preserves the legacy `projects.tags` column for compatibility. Its current checked-in version only creates associations for tags already present in the canonical catalog; historical free-form values are not catalog entries and remain in `projects.tags` until approved. Earlier execution of a previous version may have catalogued historical values; this cannot be determined from the migration file alone and has not been audited remotely. New submissions select active catalog tags (or known aliases), validate them server-side, and write canonical associations to `project_tags` while preserving `projects.tags`.

The public catalog uses normalized associations when those reads succeed; zero `project_tags` rows means no tags are displayed for that project. The legacy fallback is used only when reading the normalized schema fails.

The owner reports that `20261016_reconcile_known_project_tags.sql` was manually executed. The intermediate read-only result was 17 `ASSOCIATED` and 11 `UNCATALOGUED`. The owner then reports running `supabase/manual/approve_validated_tags.sql` to add the seven approved canonical tags and aliases. The final SQL result provided by the owner is 25 `ASSOCIATED`, 3 `UNCATALOGUED`, zero `AMBIGUOUS`, and zero `MISSING_ASSOCIATION`. The remaining values are `mcp` on SolidCraft, `office` on OpenPlayground, and `test` on Test Submit 2; they remain in `projects.tags` and were intentionally not added to the catalog. This is an owner-reported applied script and SQL result; the agent did not run SQL or modify Supabase. Do not rerun the initial tag migration or create other tags from free-form values.

The final `UNCATALOGUED` result for `test` means no canonical tag or alias matched that value, so no tag deletion was needed. The approval script did not mention or alter a catalog `test` row, alias, association, project, or legacy value. Any legacy `test` value on Test Submit 2 is preserved. The read-only preflight remains available at `supabase/manual/check_temporary_test_tag.sql`; the named-project moderation check is at `supabase/manual/check_named_project_moderation.sql`.

The approved tag set is reported applied and its associations verified. Three values (`mcp`, `office`, `test`) intentionally remain uncatalogued. Stop the tags/categories work here and wait for the owner's explicit authorization before starting another roadmap item.

The migration `20261016_add_replacing_applications.sql` adds the shared `applications` catalog and `project_replacements` relations. The project owner reports that it has been applied to Supabase and verified: both tables have row-level security enabled, and Photoshop is present in the catalog. Public roles have read access; application writes remain moderator-controlled.

**Important:** creating a migration file does not apply it to the remote Supabase project. Verify each migration and its data effects before relying on the new schema. The old `projects.tags` column remains part of the compatibility path for historical records.

Never commit `.env.local` or other secrets. Service-role keys must remain server-side.

## Project architecture

- `src/app/` — Next.js App Router pages and API routes.
- `src/components/` — UI components, including the project catalog and cards.
- `src/lib/` — data access, validation, and shared server/client utilities.
- `src/types/` — TypeScript types.
- `supabase/migrations/` — database migrations.
- `supabase/seed.sql` — seed data.
- `AGENTS.md` — persistent instructions for the coding agent.
- `PROJECT_CONTEXT.md` — current project state and prioritized roadmap.

## Product principles

- Project source code stays with its creators; CommunityCraft stores directory metadata.
- Public browsing should work without an account.
- Submissions and collaboration requests must be validated server-side and protected against abuse.
- Public project information and contact details must be handled carefully.
- Project approval does not guarantee that a repository is safe.
- Keep the interface accessible, responsive, and dark-theme-first.
