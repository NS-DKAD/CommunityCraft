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

The migration `20261015_normalize_tags_and_categories.sql` introduces normalized `tags`, `tag_aliases`, and `project_tags` tables and backfills them from the existing `projects.tags` data. It is designed to preserve the legacy column for compatibility.

**Important:** creating a migration file does not apply it to the remote Supabase project. Apply it using the project's established migration workflow, then verify the tables and row counts before relying on the new schema. Until application reads and writes are switched to `project_tags`, the old `projects.tags` column remains part of the compatibility path.

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
