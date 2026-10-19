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

The owner reports that the tag catalog was finalized through a controlled manual SQL step after `20261016_reconcile_known_project_tags.sql`. The supplied verification result is 25 `ASSOCIATED`, 3 `UNCATALOGUED` (`mcp`, `office`, `test`), zero `AMBIGUOUS`, and zero `MISSING_ASSOCIATION`; the associated tags are active and `is_official=false`. The agent did not run SQL or modify Supabase. Do not rerun the initial tag migration or create tags automatically from free-form values.

The approved catalog includes `3D Modeling` (alias `3d-modeling`), `CAD`, `BREP`, `STEP`, `egui`, `WebAssembly` (alias `wasm`) and `Web`. This is based on the owner's approval and reported SQL result; `mcp`, `office` and `test` remain uncatalogued. The read-only preflight remains available at `supabase/manual/check_temporary_test_tag.sql`.

Tag associations and the approved catalog are reported finalized by the owner. Three legacy values (`mcp`, `office`, `test`) remain intentionally uncatalogued; legacy values and projects are preserved.

The migration `20261016_add_replacing_applications.sql` adds the shared `applications` catalog and `project_replacements` relations. The project owner reports that it has been applied to Supabase and verified: both tables have row-level security enabled, and Photoshop is present in the catalog. Public roles have read access; application writes remain moderator-controlled.

**Important:** creating a migration file does not apply it to the remote Supabase project. Verify each migration and its data effects before relying on the new schema. The old `projects.tags` column remains part of the compatibility path for historical records.

## MVP roadmap

The owner-reported final check is 25 `ASSOCIATED` and 3 `UNCATALOGUED` (`mcp`, `office`, `test`), with no ambiguous or missing associations. The owner reports the approved catalog applied; legacy values and projects are preserved.

The secure administration panel is implemented locally in this checkout. Its current scope is:

- separate views for pending, published/approved, and refused submissions;
- quick project review, including opening and comparing the submitted information with its GitHub repository;
- editing project details and approving or refusing in one simple action;
- handling collaboration requests in the same space so their operational flow can be completed;
- editing the display label and stored color metadata of existing Discover tags, without creating tags or changing canonical slugs;
- managing the display label, public color, active state, and creation of project categories through the admin panel.

Security: the panel uses Supabase Auth with Discord OAuth and a separate explicit UUID allowlist. Server routes verify the user and admin role; SQL RLS denies unauthenticated/admin-unlisted reads and writes, while mutation RPCs independently check the allowlist. Project edits and status changes append an audit event atomically. The owner reports that Discord OAuth, the first admin allowlist entry, collaboration/RLS checks, Discover tag navigation, `20261018` tag presentation, `20261019` category catalog checks, and `20261020` project-report admin access are done. The agent did not rerun remote SQL.

The panel tracks collaboration requests through the schema's existing `new`, `reviewed`, `replied` and `dismissed` states. Public collaboration requests and project reports are confirmed only after database insertion succeeds. If the optional email notification fails after a collaboration request is saved, the API still returns success and points the visitor to the fact that moderators can review the saved item in the admin inbox; the server logs the delivery status without logging contact details. Similar-project recommendations are implemented.

Project edits, tag appearance, and category presentation keep **drafts** while switching records or admin sections. Unsaved items are marked. **Save all** writes remaining drafts and never reports a global success if any write failed; failed items stay drafted with per-record errors. Leaving `/admin` asks for confirmation only when drafts would actually be lost. There is no hard delete in this panel.

The admin page loads the newest 500 projects, collaboration requests, and project reports, and shows a notice at the limit. Pagination beyond that is tracked in `requested_Features.md`. Tags and Replacing entries are shown read-only in project review. Existing canonical tags can be relabeled/recolored in the Discover tags panel. Public tag filters only show active canonical tags associated with projects returned by the approved public catalog.

### Admin-managed project categories

The five current MVP categories are `Software`, `Website`, `Plugin`, `Games` and `Mods`. `By ArtCraft` remains a reserved editorial status and is never a category. The existing `projects.category` column remains text so existing project rows are not rewritten. Earlier schema migrations also permitted `Tools`, `Shaders`, `Rendering & Assets` and `Libraries`; the new catalog migration keeps those entries inactive for history while new submissions can choose only active catalog entries.

The migration `supabase/migrations/20261019_admin_project_categories.sql` adds `project_categories`, seeds the five active categories plus the four inactive historical values, protects category writes with admin-only RPCs, and updates the project-admin RPC to validate catalog entries. It replaces the old fixed category check with a trigger that rejects values absent from the catalog. It stops without committing if existing project values are blank, reserved, or outside the nine previously supported categories. No project category or association is deleted or rewritten. The owner reports that this migration was applied successfully (“Success. No rows returned”) and that post-migration data/UI checks are done. The agent did not run the SQL.

Optional read-only query if you need to re-check the project category distribution:

```sql
SELECT category, count(*) AS project_count
FROM public.projects
GROUP BY category
ORDER BY category;
```

The owner reports `20261019_admin_project_categories.sql` and `20261018_admin_discover_tag_presentation.sql` applied and checked. The agent did not run either migration. Optional catalog query:

```sql
SELECT name, slug, display_name, color, is_active, sort_order
FROM public.project_categories
ORDER BY sort_order, name;

SELECT category, count(*) AS project_count
FROM public.projects
GROUP BY category
ORDER BY category;
```

Only allowlisted admins can create categories or change their labels, colors, and active state. Public submissions revalidate category names against active catalog entries server-side; if the catalog migration is missing, only the five fixed MVP values are accepted.

### First-time admin setup (manual)

1. In the Discord Developer Portal, create an OAuth application and add the Supabase Auth callback URL shown in **Supabase Dashboard → Authentication → Sign In / Providers → Discord**.
2. Enter the Discord client ID and secret in that Supabase Discord provider. Keep the secret in Supabase only; never add it to this repository or browser environment.
3. In **Supabase Dashboard → Authentication → URL Configuration**, add the application callback URL `http://localhost:3000/auth/callback` to the redirect allowlist (use the actual local port if 3000 is occupied, and add the exact production URL when deploying).
4. The owner reports that `supabase/migrations/20261017_secure_admin_panel.sql` and `supabase/migrations/20261018_admin_discover_tag_presentation.sql` have been applied manually, and that the tag editor UI is validated. The agent did not run SQL remotely.
5. Open `/admin/login` and sign in with the intended Discord account. Signing in alone gives no admin rights; the panel will show that account's Supabase Auth UUID. The owner reports this first-time allowlist setup is already done.
6. In SQL Editor, add only that trusted UUID to the allowlist:

   ```sql
   INSERT INTO public.admin_users (user_id)
   VALUES ('<UUID displayed by the admin panel>'::uuid)
   ON CONFLICT (user_id) DO NOTHING;
   ```

7. Reload `/admin`. To revoke access, a trusted owner can remove that exact row from `public.admin_users`.

The migration backfills existing records as `approved` when `is_approved=true` and `pending` otherwise; it does not infer an earlier rejected state. New submissions default to pending. It keeps `is_approved` synchronized so the existing public catalog policy continues to hide pending and rejected projects.

Never commit `.env.local` or other secrets. Service-role keys must remain server-side.

## Project architecture

- `src/app/` — Next.js App Router pages and API routes.
- `src/components/` — UI components, including the project catalog and cards.
- `src/lib/` — data access, validation, and shared server/client utilities.
- `src/types/` — TypeScript types.
- `supabase/migrations/` — database migrations.
- `supabase/seed.sql` — seed data.
- `AGENTS.md` — persistent instructions for the coding agent.
- `PROJECT_CONTEXT.md` — current project state and remaining in-scope tasks.
- `requested_Features.md` — out-of-MVP requests (record and refuse unless Operateur insists).
- `docs/mvp-scope.md` — MVP mission and in-scope capabilities.

## Product principles

- Project source code stays with its creators; CommunityCraft stores directory metadata.
- Public browsing should work without an account.
- Submissions and collaboration requests must be validated server-side and protected against abuse.
- Public project information and contact details must be handled carefully.
- Project approval does not guarantee that a repository is safe.
- Keep the interface accessible, responsive, and dark-theme-first.
