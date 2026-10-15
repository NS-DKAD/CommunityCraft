# PROJECT_CONTEXT.md — CommunityCraft Project Context

## 1. Project Goal
CommunityCraft is an open-source community directory dedicated to creations related to the **ArtCraft** universe and ecosystem (tools, mods, shaders, libraries, rendering assets).

Key principles:
- Project files and source code remain hosted by their respective authors (mainly on GitHub).
- The website acts as a directory, discovery hub, and collaboration point.
- Visitors can explore, search, and filter listings without an account.
- Creators and the community can interact in later phases (accounts, submissions, reviews, flags).
- Default site language: **English** (UI, navigation, categories, and data models).

## 2. Planned Features & Roadmap

### Phase 1 (Completed - MVP Foundation)
- [x] Project initialization (Next.js 16+, TypeScript, Tailwind CSS v4, App Router).
- [x] Responsive, accessible, and modern homepage.
- [x] Real-time instant search (project name, description, tags, author).
- [x] Category filtering (Tools, Mods, Shaders, Rendering & Assets, Libraries).
- [x] Clearly identified sample demo projects with external GitHub links and simulated metrics.
- [x] Complete transition to English as default language across all components, metadata, and data models.

### Phase 2 (In Progress - Persistence & GitHub API)
- [x] PostgreSQL database schema designed (separate `projects` and `project_github_stats` tables, triggers, indexes, RLS policies, and `projects_with_stats` view).
- [x] SQL migration script created (`supabase/migrations/20261014_init_communitycraft_schema.sql`).
- [x] Seed data script created (`supabase/seed.sql`).
- [x] Supabase client integration prepared with environment variables (`src/lib/supabase/client.ts`, `types.ts`).
- [x] Live Supabase project connected via `.env.local` and migrations verified.
- [x] Real data retrieval verified (6 live projects served from Supabase).
- [x] Next.js 16.4 streaming architecture with `<Suspense>` boundary and `<CatalogSkeleton />` loading state.
- [x] Explicit connection error reporting (preventing connection failures from silently masquerading as demo data).
- [ ] Connection to the public GitHub API to automatically fetch live stars, licenses, and avatars.
- [ ] Submission and validation form for community GitHub repositories.

### Phase 3 (Upcoming - Community & Moderation)
- [ ] User authentication (via GitHub OAuth or secure email).
- [ ] Creator profiles with optional public contact info for collaborations.
- [ ] Community ratings, reviews, and content reporting system.
- [ ] Moderation tools and official/verified badge assignment by authorized staff.

## 3. Technical Stack
- **Framework**: Next.js 16+ (App Router, Partial Prerendering, Suspense Streaming)
- **Language**: TypeScript (strict typing)
- **Styling**: Tailwind CSS (responsive, accessible, clean)
- **Database & Backend**: Supabase (PostgreSQL with RLS, live connection verified)
- **Data Layer**: Dynamic query service with demo fallback and explicit error diagnostics (`src/lib/projects.ts`)
- **Deployment Target**: Vercel / Netlify

## 4. Next Steps
1. Build repository submission form with GitHub URL validation.
2. Integrate GitHub REST API for automated repository metadata synchronization (live stars, commit dates, open issues).
3. Introduce authentication flows for project creators.
