# requested_Features.md — Hors périmètre MVP / Feature Requests

Les demandes **non nécessaires** au MVP sont listées ici.  
**Règle :** les noter dans ce fichier et **les refuser**, sauf si Operateur insiste explicitement.

Le MVP est défini par `docs/mvp-scope.md` plus ce qui est indispensable pour qu’il soit opérationnel (catalogue, soumission, tags/catégories, collab, signalements, panel admin, projets similaires, Replacing).

---

## Items extraits des guides et demandes

| Feature Request | Importance | Difficulty | Status | Description |
|---|---|---|---|---|
| Propose custom "Replaces / Alternatives to" apps in submission form | Critical | Medium | Planned (Priority) | Allow submitters to suggest a new application in the "Replaces" section pending admin moderation/approval, instead of being strictly locked to predefined database apps. |
| Suggest & propose custom tags during project submission | Critical | Medium | Planned (Priority) | Allow submitters to propose new custom tags for their project, entering a moderation/review queue or pending tag pool before canonical admin validation, enabling users to submit accurate projects without missing tags. |
| User accounts & project ownership claims | High | Hard | Postponed | Let users claim, edit, and manage their own submissions via auth. |
| GitHub mass import | Medium | Hard | Postponed | Mass import repositories and projects directly from GitHub organizations or users. |
| Automatic GitHub metadata refresh & sync | Medium | Hard | Postponed | Background jobs refreshing stars, releases, and commits automatically via GitHub API. |
| Discord integration Bot | Low | Medium | Postponed | Send webhook notifications or Discord bot updates when new projects are published. |
| AI repository / code safety analysis | Medium | Hard | Postponed | Automated security scanning and AI summary of project codebases. |
| Plugin binary downloads hosting | Low | Hard | Won't Fix | Host external plugin binaries directly (out of scope; CommunityCraft only references repos/links). |
| Public arbitrary tag creation directly into live catalog without review | High | Medium | Won't Fix | Allow anyone to inject tags directly into the live public taxonomy without admin moderation (rejected to prevent spam & fragmentation). |
| "By ArtCraft" selectable as user category | High | Easy | Won't Fix | Let users select "By ArtCraft" (restricted editorial status granted only by authorized admins). |
| Admin pagination beyond 500 records | Low | Medium | Postponed | Paginate admin tables for very large volumes of submissions and reports. |
| Bulk actions, multi-select batch archive & hard delete | Medium | Hard | Postponed | Multi-select projects in admin panel for bulk soft archive or hard delete. |
| Admin UI for Replacing application catalog management | Low | Medium | Postponed | Web dashboard for managing the Replacing / Alternatives catalog without DB migrations. |
| Global toast / notification action bar on public site | Low | Easy | Postponed | Global toast alert bar across the public frontend. |
| Re-open archived collaboration threads | Low | Medium | Postponed | Ability to re-open closed collaboration threads to avoid duplicate tickets. |
| Author profile pictures / avatars on cards | Low | Easy | Postponed | Display author avatars fetched from GitHub or Gravatar on project cards. |
| Display co-authors and collaborator roster on cards | Low | Medium | Postponed | Detailed team roster and contributors displayed directly on catalog cards. |
| Refactor similar projects algorithm | Low | Medium | Postponed | Require at least 1 common tag, category, or replacement target to qualify as similar. |
| Dedicated "Feature Request / Bug Report" portal | High | Medium | Planned | Button / dedicated modal or page (`/feedback`) allowing users and visitors to submit feature suggestions or report bugs directly to the platform team. |
| Remove "prefers-reduced-motion" & force slow smooth animations everywhere | Medium | Medium | Postponed (Accessibility violation) | Disregard user accessibility preferences (`prefers-reduced-motion`) and inject global slow fluid animations on all interactive UI components. (Note: violates accessibility standards in `AGENTS.md` unless explicitly mandated). |
| Dedicated full-page Catalog view (12 per page with top & bottom pagination) | High | Medium | Postponed | Create a standalone `/catalog` route listing all projects (12 per page) with top and bottom page navigators, distinct from the discover filter view. |

---

Ne pas traiter ces items comme des tâches MVP courantes sans accord explicite.
