# PROJECT_CONTEXT.md — CommunityCraft Project Context

## 1. Objectif du projet

CommunityCraft est un annuaire communautaire indépendant et un espace de découverte/coordination pour les créations liées à l'écosystème ArtCraft.

- Les dépôts et fichiers restent hébergés chez leurs auteurs, principalement sur GitHub.
- Le site centralise les fiches de projets, leur statut et les possibilités de collaboration.
- La consultation du catalogue ne doit pas nécessiter de compte.
- Le site ne doit pas se présenter comme officiel sans autorisation.
- Langue par défaut de l'interface et des données : anglais.

Le périmètre produit est `docs/mvp-scope.md`. Les demandes hors MVP sont dans `requested_Features.md` (noter et refuser, sauf insistence de Danny).

## 2. État actuel connu

Les cases ci-dessous distinguent le **code local**, les migrations **écrites**, et ce que le **propriétaire rapporte** comme appliqué/vérifié. L'agent n'a pas rejoué de SQL distant.

### Base MVP et catalogue
- [x] Next.js App Router, TypeScript strict et Tailwind CSS.
- [x] Interface responsive et thème sombre (direction visuelle principale).
- [x] Recherche et filtres de catalogue.
- [x] Supabase/PostgreSQL connecté ; contexte antérieur : six projets réels.
- [x] Soumission de projets, fiches détaillées, liens GitHub.
- [x] Panel admin (Discord OAuth + allowlist UUID) implémenté localement.
- [x] Demandes de collaboration, signalements, projets similaires, Replacing.

### Étapes 1–7 — rapportées faites par le propriétaire (2026-10-17)

L'agent n'a pas rejoué ces opérations. Ne pas relancer `20261015`.

1. [x] Collab : persistance, confirmation après insert, RLS et notification admin — **rapportées vérifiées** par Danny.
2. [x] Discover : navigation parmi les tags — **rapportée faite** par Danny.
3. [x] `20261020_admin_project_reports.sql` : **écrite** dans le dépôt ; **application distante rapportée** par Danny ; code admin de revue des signalements présent.
4. [x] Contrôles post-`20261019_admin_project_categories.sql` (distribution + menus) — **rapportés faits** par Danny. Migration **écrite** ; **application rapportée** (« Success. No rows returned »).
5. [x] Éditeur d'apparence des tags (`20261018`) — migration **écrite** ; **application rapportée** ; UI **rapportée validée** par Danny.
6. [x] Setup admin OAuth Discord + premier UUID allowlist + parcours authentifié — **rapportés faits** par Danny.
7. [x] Consigne durable : ne pas relancer `20261015_normalize_tags_and_categories.sql`.

### Tags / catégories / Replacing (code + rapports)

- Tables `tags`, `tag_aliases`, `project_tags` : schéma **écrit** ; **existence + RLS rapportées**. Code : nouvelles soumissions valident le catalogue et écrivent `project_tags` ; `projects.tags` legacy conservé ; affichage public via `project_tags` (repli legacy seulement si lecture normalisée échoue).
- Catalogue tags rapporté : 25 `ASSOCIATED`, 3 `UNCATALOGUED` (`mcp`, `office`, `test`). Approuvés : `3D Modeling` (`3d-modeling`), `CAD`, `BREP`, `STEP`, `egui`, `WebAssembly` (`wasm`), `Web` ; `is_official=false`. Ne pas créer de tags depuis le texte libre.
- `20261016_add_replacing_applications.sql` : **écrite** ; **application rapportée** (RLS, Photoshop). Code soumission/catalogue l'utilise.
- `20261017_secure_admin_panel.sql` : **écrite** ; **application rapportée**.
- Catégories MVP actives : `Software`, `Website`, `Plugin`, `Games`, `Mods`. Historiques inactives : `Tools`, `Shaders`, `Rendering & Assets`, `Libraries`. « By ArtCraft » n'est pas une catégorie.

### Admin — brouillons (code local, 2026-10-17)

- [x] Brouillons projet conservés entre fiches et sections ; badge Unsaved ; Save all ; erreurs par fiche ; pas de succès global si une écriture échoue ; confirmation seulement si quitter la page abandonnerait des changements.
- [x] Brouillons tags / catégories / nouveau formulaire de catégorie également conservés hors de la section visible ; inclus dans Save all.

## 3. Catégories MVP

Sélectionnables : `Software`, `Website`, `Plugin`, `Games` et `Mods`.  
« By ArtCraft » = badge éditorial autorisé, jamais une catégorie publique.

## 4. Schéma de tags

`tags` / `tag_aliases` / `project_tags` + colonne legacy `projects.tags`. Politique MVP : choix parmi tags existants ; pas de création publique libre ; alias → canonique ; pas de fusion/suppression auto.

## 5. Stack technique

- Next.js App Router, TypeScript strict, Tailwind CSS, Supabase/PostgreSQL avec RLS.
- Migrations : `supabase/migrations/`. Seed : `supabase/seed.sql`.

## 6. Tâches restantes pour un MVP opérationnel

**P0 — clos** (étapes 1–7 rapportées faites par Danny, 2026-10-17). Aucun blocage P0 documenté.

**P1 — éviter la perte de travail admin** (en cours / implémenté localement le 2026-10-17 ; à valider dans le panel authentifié si pas déjà fait par Danny)

- Empêcher la perte silencieuse en changeant de fiche ou de section.
- Brouillons conservés entre sélections ; état non sauvegardé visible.
- Sauvegarde groupée « Save all ».
- Confirmation/guard seulement si la navigation abandonnerait vraiment des changements (quitter `/admin`).
- Erreurs par fiche ; jamais un succès global si une écriture a échoué.
- Pas de suppression dure.
- Barre d'état en bas du panel admin pour le statut groupé (succès partiel, échecs nommés). Ne pas remplacer les erreurs de formulaire par un toast éphémère.

**P2 — confort in-scope & Préparation production (exécuté le 2026-10-17 selon l'ordre 1, 3, 2, 4)**

- **Étape 1 (Production)** : En-têtes HTTP de sécurité configurés dans `next.config.ts` (CSP/X-Frame-Options/XSS/Permissions-Policy) et documentation complète des variables dans `.env.example`.
- **Étape 3 (SEO & Visibilité)** : Métadonnées OpenGraph dynamiques sur `/projects/[slug]`, `robots.txt` et `sitemap.xml` dynamiques générés, et texte des puces catégories harmonisé avec la couleur de la bordure.
- **Étape 2 (Données & Cohérence)** : Données de repli démo réalignées sur les 5 catégories MVP actives (`Software`, `Website`, `Plugin`, `Games`, `Mods`) et les tags canoniques approuvés (`3d-modeling`, `cad`, `brep`, `wasm`, `egui`, `web`, `step`).
- **Étape 4 (Tests Parcours Utilisateur)** : Suite `user-journey.test.ts` ajoutée pour valider le parcours complet (consultation catalogue, repli démo, recherche, validation des requêtes de collaboration et des signalements).

Idées hors MVP notées dans `requested_Features.md` : réactivation de vieux threads archivés, photos de profil sur les cartes, liste complète des collaborateurs en plus de l'auteur.

## 7. Vérifications

Dernières vérifications exécutées (2026-10-17) :

- `npx tsc --noEmit` : OK (0 erreur de types).
- `npm run lint` : OK (0 erreur, 1 warning restant sur paramètre d'erreur `_err`).
- `npm test` : 7 suites, 72 tests passés avec succès (+ suite `user-journey.test.ts`).
- `npx next build --webpack` : **SUCCÈS CONFIRMÉ** (14 pages/routes générées dont `robots.txt` et `sitemap.xml`, 0 erreur).

Les contrôles locaux confirment l'intégrité du code applicatif. Danny rapporte que les étapes 1–7 distantes/UI sont faites.


## 8. Garde-fous

- Pas de secret service-role côté navigateur, Git ou journaux.
- Ne jamais exécuter le code d'un dépôt soumis. Une fiche approuvée n'est pas un dépôt sûr.
- Badges officiel/vérifié : personnes autorisées.
- Démo clairement identifiée. Annuaire indépendant ArtCraft.
- Catalogue public sans compte. Contacts seulement s'ils sont fournis pour la collaboration.
- Discord ≠ admin. Allowlist + contrôles serveur.
- Préférer l'archivage réversible. Pas de suppression dure sans autorisation.
- Dark-first. Styles tags et catégories distincts.

## 9–13. Fonctionnalités déjà en place (résumé)

Similaires, sélection de tags canoniques, Replacing, panel admin (files, inbox collab, signalements, tags présentation, catégories), Discover filtré sur le catalogue public approuvé : voir l'historique des sections 9–13 des versions antérieures. Comportement inchangé sauf brouillons admin (section 2).
