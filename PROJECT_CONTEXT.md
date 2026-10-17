# PROJECT_CONTEXT.md — CommunityCraft Project Context

## 1. Objectif du projet

CommunityCraft est un annuaire communautaire indépendant et un espace de découverte/coordination pour les créations liées à l'écosystème ArtCraft.

- Les dépôts et fichiers restent hébergés chez leurs auteurs, principalement sur GitHub.
- Le site centralise les fiches de projets, leur statut et les possibilités de collaboration.
- La consultation du catalogue ne doit pas nécessiter de compte.
- Le site ne doit pas se présenter comme officiel sans autorisation.
- Langue par défaut de l'interface et des données : anglais.

## 2. État actuel connu

### Base MVP et catalogue
- [x] Next.js App Router, TypeScript strict et Tailwind CSS.
- [x] Interface responsive et thème sombre validé comme direction visuelle principale.
- [x] Recherche et filtres de catalogue déjà présents.
- [x] Supabase/PostgreSQL connecté ; le contexte antérieur indique six projets réels récupérés.
- [x] Soumission de projets et champ d'approbation en base présents. Le panel admin et son authentification Discord via Supabase Auth sont implémentés localement ; le propriétaire rapporte l'application de la migration admin principale. Configuration OAuth et allowlist initiale restent à confirmer.
- [x] Fiches détaillées et liens GitHub externes.
- [x] Modèle de demandes de collaboration et endpoint de soumission ajoutés selon les rapports de développement antérieurs.

### Catégories et tags — état final rapporté
- [x] Schéma d'application local : `tags`, `tag_aliases`, `project_tags`, avec compatibilité conservée via `projects.tags`.
- [x] Le propriétaire rapporte l'exécution de `20261016_reconcile_known_project_tags.sql`, puis du script manuel contrôlé d'approbation. Résultat final fourni : 25 associations `ASSOCIATED`, 3 valeurs `UNCATALOGUED` (`mcp`, `office`, `test`), zéro `AMBIGUOUS` et zéro `MISSING_ASSOCIATION`.
- [x] Tags approuvés : `3D Modeling` (alias `3d-modeling`), `CAD`, `BREP`, `STEP`, `egui`, `WebAssembly` (alias `wasm`) et `Web`. Les associations existantes sont rapportées actives et `is_official=false`.
- [x] Le chantier tags/catégories est terminé selon le contrôle communiqué. Les trois valeurs legacy non cataloguées et les fiches sont préservées ; aucune suppression ou écriture distante n'a été effectuée par l'agent.

### Statut des migrations de tags
- `20261015_normalize_tags_and_categories.sql` : migration préparée et revue localement ; une version précédente peut avoir été exécutée. L'exécution exacte de la version locale actuelle n'est pas confirmée. Ne pas la relancer.
- `20261016_reconcile_known_project_tags.sql` : exécution manuelle rapportée par le propriétaire ; son premier contrôle a retourné 17 associations et 11 valeurs non cataloguées.
- `supabase/manual/approve_validated_tags.sql` : script manuel (pas une migration) dont l'application est rapportée par le propriétaire ; le contrôle final est détaillé ci-dessus.
- Aucune de ces opérations distantes n'a été exécutée par l'agent.

### Demandes de collaboration — flux corrigé localement, validation distante à faire
- [x] Table `project_contribution_requests` et endpoint de demande de collaboration rapportés comme implémentés.
- [x] Le formulaire côté fiche sépare maintenant le retour du signalement et celui de la demande de collaboration : chacun apparaît dans sa section dédiée.
- [x] Les API ne renvoient une confirmation qu'après insertion réussie. En cas d'échec de l'insertion, elles renvoient une erreur sans afficher de succès.
- [x] Après insertion d'une demande, un échec d'e-mail reste un succès de soumission (`201`) ; l'échec est journalisé sans données de contact et le message indique que la demande reste visible pour les modérateurs dans l'inbox admin. Aucun nouvel envoi côté client n'est suggéré.
- [ ] Vérifier la notification administrateur et le parcours avec les politiques RLS sur l'environnement réel.

### Signalements — revue admin locale, migration requise
- [x] La table `project_reports` existait déjà ; l'API publique enregistre un signalement avec le statut `open`, sans masquer automatiquement le projet.
- [x] Le panel admin local charge les signalements dans une vue séparée des demandes de collaboration, permet les statuts `open`, `reviewed` et `dismissed`, et affiche les décisions dans le journal d'activité.
- [x] La migration locale `supabase/migrations/20261020_admin_project_reports.sql` réserve la lecture aux administrateurs via RLS, expose une RPC d'édition avec contrôle allowlist et ajoute la décision au journal d'audit dans la même transaction. Elle ne supprime ni ne modifie des signalements existants.
- [ ] Cette migration n'a pas été exécutée à distance ; la revue de signalements admin restera indisponible jusqu'à son application manuelle puis à la vérification du parcours authentifié.

Ces cases décrivent les rapports de l'agent et les travaux connus ; elles ne constituent pas une preuve que les migrations distantes ou les notifications sont opérationnelles.

## 3. Catégories MVP

Catégories sélectionnables pour le MVP : `Software`, `Website`, `Plugin`, `Games` et `Mods`.

Les valeurs historiques `Tools`, `Shaders`, `Rendering & Assets` et `Libraries` sont toujours présentes dans les contraintes/fichiers de migration antérieurs. Le propriétaire rapporte avoir appliqué `20261019_admin_project_categories.sql` avec le résultat « Success. No rows returned ». La migration conserve ces valeurs comme entrées inactives et ne réécrit pas `projects.category`; les nouvelles catégories restent des valeurs texte canoniques référencées par `project_categories`. Le contrôle post-migration de la distribution des catégories et des menus UI reste à faire ; ne pas marquer le contrôle de bout en bout comme terminé avant ce résultat.

« By ArtCraft » doit être un badge/statut éditorial attribué par une personne autorisée, et non une catégorie que n'importe quel contributeur peut sélectionner.

## 4. Schéma de tags prévu

La migration `20261015_normalize_tags_and_categories.sql` ajoute :
- `tags` : tag canonique, slug et indicateurs d'activité/officiel.
- `tag_aliases` : variantes qui renvoient vers un tag canonique.
- `project_tags` : association plusieurs-à-plusieurs entre projets et tags.

La colonne historique `projects.tags` est conservée pour compatibilité. Il faut distinguer trois états : migration SQL écrite, migration réellement appliquée sur Supabase, et application effectivement basculée sur les tables normalisées.

Politique MVP :
- les contributeurs choisissent des tags existants ;
- pas de création publique libre de tags sans décision explicite ;
- les alias doivent résoudre vers un tag canonique ;
- pas de fusion ou suppression automatique risquant de perdre des associations ;
- les tags officiels sont administrés, pas auto-attribués.

## 5. Stack technique

- **Framework :** Next.js App Router
- **Langage :** TypeScript strict
- **Style :** Tailwind CSS
- **Base de données :** Supabase / PostgreSQL avec RLS
- **Données GitHub :** intégration API à venir si nécessaire
- **Migrations :** `supabase/migrations/`
- **Données initiales :** `supabase/seed.sql`

## 6. Feuille de route priorisée

### Blocages opérationnels du MVP — P0
1. **Demandes de collaboration : persistance et confirmation fiables.** Le partage accidentel de l'état de confirmation entre le signalement et la participation est corrigé localement ; vérifier le placement en interface réelle. Les API confirment après insertion uniquement. En cas d'e-mail défaillant, l'enregistrement reste confirmé et consultable dans l'inbox admin, avec journal serveur ; valider le flux et les politiques RLS réels. La reprise existante est la revue manuelle depuis l'inbox (aucun renvoi d'e-mail automatique n'est implémenté).
2. **Discover : navigation parmi les tags.** Le propriétaire rapporte que le menu affiche actuellement tous les tags. À reproduire/valider, puis concevoir un menu déroulant propre, recherchable et accessible, utilisable avec environ 150 tags, cohérent avec le thème existant.
3. **Cycle de modération admin traçable.** La vue admin dédiée aux signalements et les mutations auditées sont implémentées localement. Appliquer la migration `20261020_admin_project_reports.sql`, puis valider RLS, lecture, décision et historique avec un compte administrateur réel.
4. **Contrôle catégories/tags après migration.** Le propriétaire rapporte l'application de `20261019_admin_project_categories.sql`; exécuter les contrôles post-migration de la distribution réelle et valider les menus/formulaires admin et publics avant de déclarer cette étape terminée. Le propriétaire rapporte aussi l'application de `20261018_admin_discover_tag_presentation.sql`; son résultat UI reste à valider.

### Améliorations de confort admin — P1
- **Retour d'action global :** prévoir une barre/toast persistante en bas pour les actions pertinentes du site public et de l'admin, avec états d'attente, succès, échec et détails utiles sans perdre d'information.
- **Édition non sauvegardée :** empêcher la perte silencieuse des modifications en changeant de fiche/section. Concevoir une sauvegarde groupée « Save all » ou un brouillon global avec état dirty, confirmation/navigation claire, erreurs par fiche et indicateur de persistance.
- **Puces catégories et tags :** définir une règle visuelle commune pour les couleurs personnalisées (fond légèrement teinté, bordure et texte cohérents, contraste suffisant). Garder le style des tags distinct de celui des catégories.

### Évolutions différées — P2 ou autorisation séparée
- **Actions groupées :** permettre de sélectionner plusieurs cartes. Préférer une désactivation/archivage réversible. Toute suppression définitive exige une confirmation explicite, un aperçu de l'impact, une autorisation admin et la protection des relations et de l'audit ; afficher un résultat par ligne.
- Import massif GitHub, bot Discord, comptes/gestion de compte et autres extensions de roadmap : ne pas démarrer sans autorisation explicite. Préserver une revue/modération avant toute publication.

Les projets similaires et les modèles Replacing sont déjà implémentés. Le produit reste un annuaire indépendant et un outil de coordination communautaire ; ne pas élargir le MVP au-delà de ces priorités sans décision du propriétaire.

## 7. Vérifications

Dernière vérification locale pour la fonctionnalité Replacing (2026-10-16) :
- `npx tsc --noEmit` : OK.
- `npm run lint` : OK, 0 erreur et 2 warnings préexistants (`Link` non utilisé dans la page projet et `_err` non utilisé dans les notifications).
- `npm test -- --runInBand` : OK, 40 tests, dont absence de relation normalisée et repli legacy uniquement en cas d'erreur de lecture.
- `npx next build` : échec environnemental répété dans Turbopack lors du traitement CSS, avec un processus enfant qui se termine sans diagnostic applicatif.
- `npx next build --webpack` : échec environnemental, résolution DNS impossible pour `fonts.googleapis.com` (polices `next/font`), puis `EPERM` à la création de `.next/server/app/submit`. Build de production non confirmé.
- Vérification HTTP locale : `/` et `/?q=Photoshop` ont tous deux répondu `200`, le shell de la page était présent et le champ de recherche contenait `Photoshop` pour la seconde URL ; aucune soumission n'a été faite.
- La migration Replacing a été exécutée sur Supabase selon la confirmation de l'utilisateur. Pour les tags, le résultat final communiqué est 25 `ASSOCIATED` et 3 `UNCATALOGUED` (`mcp`, `office`, `test`), zéro `AMBIGUOUS` et zéro `MISSING_ASSOCIATION`. Les migrations admin `20261017`, `20261018` et `20261019` sont rapportées appliquées par le propriétaire. Aucune SQL distante n'a été exécutée par l'agent ; les contrôles post-migration de `20261019` restent en attente.
- La migration locale `20261020_admin_project_reports.sql` est écrite mais non appliquée. Elle est nécessaire à la lecture admin et aux décisions auditées sur `project_reports`.

Les contrôles TypeScript, lint et tests couvrent le code local. Ils ne prouvent ni l'application des migrations distantes ni le fonctionnement contre le projet Supabase réel.

Vérifications locales du panel admin (2026-10-16) :
- `npx tsc --noEmit` : OK après la génération des types Next ; un passage exécuté en parallèle du build a vu `.next/types` en cours de réécriture et a échoué temporairement, puis le contrôle relancé seul a réussi.
- `npm run lint` : OK, deux warnings préexistants sans erreur.
- `npm test -- --runInBand` : 54 tests réussis sur 3 suites après le chantier catégories.
- `npx next build --webpack` : échec environnemental avant compilation, DNS indisponible pour `fonts.googleapis.com` (`next/font`, Geist et Geist Mono). Build de production non confirmé.
- Parcours HTTP local non authentifié : `/admin/login` rend l'écran de connexion ; `/admin` redirige vers `/admin/login`. Aucun clic OAuth ni changement de base n'a été effectué.
- La configuration OAuth, l'inscription de l'UUID administrateur et le parcours authentifié réel restent à confirmer si ces étapes n'ont pas encore été réalisées.

## 8. Garde-fous produit, liens et sécurité

- Ne jamais exposer de clé Supabase service-role ou autre secret côté navigateur.
- Ne jamais exécuter automatiquement le code d'un dépôt soumis.
- L'approbation d'une fiche ne garantit pas que le code du projet est sûr.
- Les badges « officiel » et « vérifié » doivent être réservés aux personnes autorisées.
- Les données de démonstration doivent être clairement identifiées et ne pas être confondues avec des projets réels.
- Agir comme garde-fou produit : rester un annuaire indépendant et un outil de coordination communautaire pour ArtCraft, sans revendiquer de statut officiel.
- Garder la consultation publique accessible sans compte ; les dépôts et fichiers restent chez leurs auteurs, principalement sur GitHub.
- Ne pas collecter ni publier des coordonnées au-delà de ce qui est explicitement fourni pour la collaboration ; éviter toute collecte abusive.
- Une connexion Discord ou autre authentification ne donne jamais de privilège admin à elle seule. La modération doit rester autorisée côté serveur et traçable.
- Protéger les données et leurs relations. Préférer l'archivage réversible ; ne pas supprimer définitivement si cela n'est pas nécessaire et explicitement approuvé.
- Ne pas ajouter de bot Discord, import massif, comptes ou fonctionnalités de compte sans autorisation explicite du propriétaire.
- Préserver l'interface dark-first. Les styles des tags et des catégories doivent rester distincts et lisibles.

## 9. Projets similaires et sélection de tags — améliorations live
- [x] La logique des projets similaires a été affinée pour privilégier les tags partagés réels, avec un bonus supplémentaire si la catégorie est identique et un léger bonus si le statut correspond.
- [x] Le score reste simple et explicite : une ou plusieurs tags communes comptent plus qu'un simple partage de catégorie, tout en conservant un fallback si aucune relation forte n'est détectée.
- [x] Le formulaire propose seulement les tags canoniques actifs et leurs alias résolus vers le canonique ; une recherche sans résultat ne permet pas de créer un tag libre.
- [x] L'API revalide les slugs/alias contre le catalogue actif, rejette les tags inconnus ou ambigus, écrit les identifiants canoniques dans `project_tags` et conserve les slugs dans `projects.tags` pour compatibilité.
- [x] Le catalogue public affiche uniquement les noms liés via `project_tags` lorsque la lecture normalisée réussit ; zéro relation signifie zéro tag affiché. Le repli vers `projects.tags` ne se produit qu'en cas d'échec de lecture du schéma normalisé.
- [x] L'écriture des associations est intégrée à la persistance fiable de la soumission ; un échec déclenche un nettoyage vérifié ou une confirmation explicite évitant une soumission en double.
- [x] `projects.tags` reste conservé pour les données historiques et les anciens projets.

## 10. Replacing — intégration locale
- [x] Modèle normalisé local : catalogue partagé `applications` et table de liaison `project_replacements`, avec niveaux `Complete`, `Partial` et `Specialized` et unicité par paire projet/application.
- [x] La migration versionnée `supabase/migrations/20261016_add_replacing_applications.sql` vérifie d'abord le type et les colonnes requises si `applications` existe déjà ; elle s'arrête avec un diagnostic sans modifier les données si le schéma ou les noms/IDs/slugs sont incompatibles. Elle applique ensuite RLS : lecture publique du catalogue, lecture des relations uniquement pour les projets approuvés, aucun droit d'écriture public. Elle ajoute Photoshop comme première entrée et bloque les doublons de nom sans tenir compte de la casse.
- [x] Le formulaire de soumission permet de rechercher et sélectionner plusieurs applications déjà référencées, de choisir un niveau compréhensible et de retirer une sélection. Une saisie inconnue n'est pas créée ni soumise ; l'interface indique qu'il faut demander à un modérateur d'ajouter l'application.
- [x] Le serveur revalide les niveaux et les identifiants du catalogue et rejette les doublons ; si l'écriture des relations échoue, il tente de supprimer la fiche nouvellement créée et vérifie la suppression. Si le nettoyage échoue, il confirme la réception avec un message « ne pas resoumettre » et journalise les deux erreurs afin d'éviter une soumission en double.
- [x] Le catalogue recherche aussi dans les noms d'applications remplacées ; les fiches projet affichent les relations et proposent un lien pour trouver d'autres alternatives.
- [x] Les projets sans relation restent compatibles ; la propriété `replacing` est vide par défaut et l'échec de lecture des nouvelles tables n'empêche pas le chargement des projets.
- [x] Tests ajoutés pour plusieurs applications, les trois niveaux, la recherche par application, l'absence de relations, les doublons et les identifiants inconnus ; ils couvrent aussi l'échec de sauvegarde des relations, le nettoyage confirmé et le nettoyage en échec avec confirmation de réception.
- [x] L'utilisateur confirme avoir exécuté la migration `20261016_add_replacing_applications.sql` dans Supabase. Vérification rapportée : `applications` et `project_replacements` ont RLS activé, et l'entrée Photoshop a été vérifiée. Le schéma distant est donc activé pour Replacing ; aucune écriture distante n'a été effectuée par l'agent.
- [ ] Les ajouts futurs au catalogue restent modérés et se font via SQL contrôlé ; aucun écran d'administration n'est inclus.

## 11. Tags — état final rapporté par le propriétaire
- [x] Les tables `tags`, `tag_aliases` et `project_tags` existent dans Supabase et RLS est activé sur chacune (vérification rapportée par l'utilisateur).
- [x] Le backfill SQL est ponctuel et ne synchronise pas les nouvelles soumissions ; le formulaire et l'API ont été corrigés localement pour accepter uniquement les tags canoniques/alias déjà présents.
- [x] L'utilisateur rapporte avoir exécuté manuellement `supabase/migrations/20261016_reconcile_known_project_tags.sql`. Cette migration associe uniquement les tags canoniques ou alias déjà existants ; elle ne crée aucun tag public à partir de texte libre historique. Aucune migration n'a été lancée par l'agent.
- [x] Résultat final rapporté : 25 associations `ASSOCIATED`, 3 `UNCATALOGUED` (`mcp`, `office`, `test`), aucune `AMBIGUOUS` ni `MISSING_ASSOCIATION`.
- [!] La version initiale de `20261015_normalize_tags_and_categories.sql` insérait automatiquement toutes les valeurs historiques dans le catalogue actif. Le fichier local a été corrigé pour les prochaines exécutions : il ne crée plus de tags depuis `projects.tags`. Cette modification locale ne retire ni ne désactive les lignes déjà créées sur une base distante ; leur statut doit être vérifié avant de les considérer comme approuvées.
- [x] Le propriétaire a approuvé et rapporte l'application de `3D Modeling` (alias `3d-modeling`), `CAD`, `BREP`, `STEP`, `egui`, `WebAssembly` (alias `wasm`) et `Web` via le script manuel contrôlé. Les associations sont rapportées actives et `is_official=false`.
- [x] Les valeurs `mcp`, `office` et `test` restent non cataloguées ; les valeurs legacy et fiches sont préservées. Aucun SQL ni aucune suppression distante n'a été réalisé par l'agent.
- [x] L'utilisateur a fourni le contrôle de modération : `SolidCraft`, `OpenPlayground` et `Test Submit 2` sont approuvés.
- [x] `projects.tags` reste conservé pour compatibilité.

Le catalogue de tags est terminé selon les résultats SQL et validations rapportés par le propriétaire. Ne pas créer d'autres tags automatiquement.

## 12. Panel admin — implémenté localement, migration principale rapportée appliquée
- [x] Connexion Discord OAuth avec Supabase Auth et sessions gérées par cookies SSR ; l'ID utilisateur est vérifié avec Supabase Auth côté serveur.
- [x] L'accès admin est réservé aux UUID explicitement inscrits dans `public.admin_users`. Se connecter avec Discord ne donne aucun droit par défaut.
- [x] Files projets « Pending », « Published » et « Rejected » ; vue de revue, comparaison par liens externes, édition des champs et actions enregistrées ensemble.
- [x] Inbox des demandes de collaboration avec états `new`, `reviewed`, `replied`, `dismissed` mappés en libellés de traitement. Les coordonnées de contact ne sont chargées qu'après autorisation admin.
- [x] Les changements projet et demandes créent un évènement `moderation_events` atomique via RPC. Les API valident les entrées et chaque mutation exige une requête same-origin.
- [x] Le propriétaire rapporte avoir appliqué `supabase/migrations/20261017_secure_admin_panel.sql`. L'agent n'a effectué aucune écriture distante.
- [x] `/admin` utilise `connection()` avant la lecture de la session Auth et des données, pour éviter le prerender de valeurs liées à la requête tout en gardant la vérification utilisateur et allowlist.
- [x] Les recommandations similaires priorisent les applications cibles partagées via les identifiants canoniques `application_id`, puis tags/catégorie/statut ; le projet lui-même est exclu et un fallback populaire reste présent sans critère partagé.
- [x] Discover n'affiche que les tags actifs associés à au moins un projet du catalogue public approuvé. Le libellé/couleur stocké des tags reste éditable séparément; les couleurs personnalisables rendues dans l'interface publique s'appliquent aux catégories.
- [x] Le propriétaire rapporte l'application de `supabase/migrations/20261018_admin_discover_tag_presentation.sql`. L'agent ne l'a pas exécutée ; le fonctionnement de l'éditeur d'apparence des tags reste à valider dans l'interface.
- [x] Le propriétaire rapporte l'exécution de `supabase/migrations/20261019_admin_project_categories.sql` (« Success. No rows returned »). Le script crée le catalogue contrôlé et conserve les catégories historiques inactives sans réécrire les valeurs de projet.
- [ ] Contrôle post-migration à obtenir : distribution de `projects.category`, contenu/état de `project_categories`, puis validation des menus/formulaires catégories sur le site et dans le panel. Le résultat « Success » ne prouve pas à lui seul ces contrôles UI.
  Requêtes de lecture seule pour ce contrôle :
  ```sql
  SELECT category, count(*) AS project_count FROM public.projects GROUP BY category ORDER BY category;
  SELECT name, slug, is_active, display_name, color FROM public.project_categories ORDER BY sort_order, name;
  ```
- [ ] Configuration OAuth, inscription du premier UUID administrateur, parcours authentifié et contrôle RLS end-to-end restent à vérifier si pas déjà effectués.
- [!] Les listes chargent les 500 fiches/demandes les plus récentes et affichent un avertissement à cette limite ; la pagination reste une évolution de capacité.

## 13. Discover et recommandations similaires — ajustements locaux
- [x] Les recommandations similaires comparent les IDs canoniques des applications de `project_replacements`, en priorité sur les tags/catégorie/statut.
- [x] Le fallback conserve des recommandations publiques même lorsqu'aucun projet n'a de relation Replacing ou autre recouvrement.
- [x] Les filtres Discover calculent les comptes catégories/tags depuis les projets déjà chargés par la requête publique `is_approved=true` ; les valeurs sans projets visibles n'apparaissent pas.
- [x] `20261018_admin_discover_tag_presentation.sql` ajoute `tags.display_name` et `tags.color`, des contrôles de valeurs et le RPC `admin_update_tag_presentation` vérifiant l'allowlist. Le propriétaire rapporte son application ; l'agent ne l'a pas exécutée. Elle ne change ni slugs ni associations ; le parcours UI reste à valider.
- [x] `20261019_admin_project_categories.sql` ajoute localement le catalogue `project_categories`, les valeurs MVP actives, les valeurs historiques inactives, une validation DB et des RPC protégés pour création/présentation. Le propriétaire rapporte l'avoir appliquée (« Success. No rows returned »). `projects.category` reste du texte canonique ; `By ArtCraft` est refusé comme catégorie.
- [x] Le formulaire et l'API de soumission utilisent uniquement les catégories actives du catalogue; l'API retombe sur la liste MVP codée en dur seulement si la table n'existe pas encore, et refuse toute valeur non approuvée.
- [x] Le propriétaire rapporte que `20261018_admin_discover_tag_presentation.sql` et `20261019_admin_project_categories.sql` ont été appliquées. Aucune migration distante n'a été exécutée par l'agent.
- [ ] Les contrôles post-migration catégories en base et dans les menus UI restent nécessaires ; ne pas déclarer le contrôle bout en bout complet avant leur validation.
- [x] Vérifications catégories (2026-10-16) : `npx tsc --noEmit` OK ; `npm run lint` sans erreur (deux warnings préexistants) ; `npm test -- --runInBand` OK, 54 tests sur 3 suites ; `git diff --check` OK.
- [!] Build standard bloqué par un plantage Turbopack du processus enfant pendant l'analyse CSS (`src/app/globals.css.css`). Le build Webpack de secours est bloqué par l'absence de DNS/réseau pour `fonts.googleapis.com` (`next/font` Geist/Geist Mono). Le build production n'est pas confirmé.
- [ ] Le test de l'interface authentifiée contre Supabase réel n'est pas fait par l'agent ; aucune SQL distante n'a été exécutée.
