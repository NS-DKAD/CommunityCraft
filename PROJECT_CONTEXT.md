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
- [x] Soumission de projets et validation/modération initiale en place.
- [x] Fiches détaillées et liens GitHub externes.
- [x] Modèle de demandes de collaboration et endpoint de soumission ajoutés selon les rapports de développement antérieurs.

### Catégories et tags — état vérifié localement
- [x] Migration SQL préparée : `supabase/migrations/20261015_normalize_tags_and_categories.sql`.
- [x] Tables prévues par la migration : `tags`, `tag_aliases`, `project_tags`.
- [x] Backfill non destructif prévu depuis `projects.tags` vers les tables normalisées.
- [x] Les types, la validation des nouvelles soumissions, le formulaire et les filtres ont été mis à jour pour les catégories et tags reconnus par la base.
- [x] La logique de normalisation a été corrigée pour éviter les collisions de tags distincts, y compris lorsque seule la casse diffère, et pour arrêter explicitement si un tag historique normalise en slug vide.
- [x] Correction de défaut majeur sur la migration : la correspondance `raw_tag -> slug` doit être calculée une seule fois sur les tags historiques distincts globaux, et réutilisée identiquement aux étapes 6, 8 et dans les validations finales. Le calcul basé sur les occurrences par projet provoquait un hachage différent pour `adobe` dans les deux projets et rompait la transaction.
- [x] Correction de défaut majeur sur l’étape 7 : l’ambiguïté ne doit pas être testée après un regroupement déjà effectué par `(raw_tag, slug)` ; il faut vérifier les collisions de slug globales sur la correspondance unique, puis bloquer si deux tags historiques distincts produisent le même slug final.
- [x] Le script conserve `projects.tags` et ne supprime aucun projet ni aucune donnée existante.
- [x] L’application lit maintenant les tags canonique via `project_tags` + `tags` avec repli sans casser la compatibilité legacy ; les recherches et filtres utilisent ces tags quand ils sont disponibles.
- [x] Les catégories autorisées côté app correspondent maintenant à la liste réelle acceptée par la base : `Tools`, `Mods`, `Shaders`, `Rendering & Assets`, `Libraries`, `Software`, `Website`, `Plugin`, `Games`.
- [x] Les tests de recherche par tag, filtrage et cas sans association ont été ajoutés et passent.
- [x] Vérification locale exécutée : `npx tsc --noEmit`, `npm run lint`, `npx next build`, `npm test -- --runInBand`.
- [ ] Vérifier que la migration a été appliquée à l'instance Supabase distante. La présence du fichier SQL ne prouve pas qu'elle a été appliquée.
- [ ] Ajouter/valider la liste initiale de tags officiels pertinents, sans doublons inutiles.
- [ ] Définir et tester la résolution des alias vers les tags canoniques.
- [ ] Garder la colonne `projects.tags` tant que la migration applicative n'est pas validée ; ne pas la supprimer dans cette étape.
- [ ] Tester le script SQL sur un vrai serveur PostgreSQL local ou Supabase de validation. L’environnement disponible ne fournit pas de PostgreSQL local exécutable, donc le test réel reste impossible ici sans un environnement dédié.

### Catégories et tags — statut de la migration SQL
- [x] La migration `supabase/migrations/20261015_normalize_tags_and_categories.sql` a été revue en lecture seule et corrigée pour utiliser une correspondance historique unique `raw_tag -> slug`.
- [x] Les tables prévues restent `tags`, `tag_aliases` et `project_tags`.
- [x] Les politiques RLS et les `GRANT SELECT` ont été conservés pour la lecture publique minimale nécessaire.
- [x] Les valeurs nulles, vides, les collisions de slug et les associations manquantes sont bloquées explicitement avant `COMMIT`.
- [ ] Validation réelle PostgreSQL distante ou locale non exécutée dans cet environnement ; uniquement validation statique du SQL et vérification des contraintes et protections.

### Demandes de collaboration — à fiabiliser
- [x] Table `project_contribution_requests` et endpoint de demande de collaboration rapportés comme implémentés.
- [x] Formulaire côté fiche de projet rapporté comme implémenté.
- [ ] Vérifier la notification administrateur et son comportement en cas d'échec.
- [ ] Si la demande est enregistrée en base mais que l'e-mail échoue, confirmer la réception à l'utilisateur et signaler l'échec côté serveur pour permettre une reprise. Ne pas renvoyer une erreur qui pousse à soumettre une seconde demande déjà enregistrée.
- [ ] Vérifier la migration sur Supabase, les politiques RLS et le parcours de bout en bout dans l'environnement réel.

Ces cases décrivent les rapports de l'agent et les travaux connus ; elles ne constituent pas une preuve que les migrations distantes ou les notifications sont opérationnelles.

## 3. Catégories MVP

Catégories sélectionnables :
- `Tools`
- `Mods`
- `Shaders`
- `Rendering & Assets`
- `Libraries`
- `Software`
- `Website`
- `Plugin`
- `Games`

Les catégories sont maintenant alignées sur les valeurs réellement acceptées en base après la migration de normalisation.

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

1. **Finaliser les tags et catégories**
   - vérifier l'application de la migration Supabase ;
   - établir une liste cohérente d'au moins 100 tags pertinents ;
   - utiliser réellement les tables normalisées dans le formulaire, le catalogue, la recherche et les fiches ;
   - préserver les données et tester les alias.
2. **Fiabiliser les demandes de collaboration**
   - tester l'enregistrement en base ;
   - garantir une confirmation cohérente côté utilisateur ;
   - traiter les erreurs de notification sans faire croire qu'une demande enregistrée a échoué ;
   - vérifier les politiques d'accès et les limites anti-spam.
3. **Projets similaires**
   - suggérer des projets liés à partir des tags/catégories communs, avec un comportement utile si aucun tag n'est disponible.
4. **Import de masse GitHub**
   - différé jusqu'à ce que tags et demandes de collaboration soient solides ;
   - conserver une étape de revue/modération avant publication publique.

Ensuite : enrichissement des métadonnées GitHub, comptes et gestion des projets par leurs auteurs, outils de modération. Ne pas lancer ces étapes en avance sans nécessité.

## 7. Vérifications

Dernière vérification locale pour la fonctionnalité Replacing (2026-10-16) :
- `npx tsc --noEmit` : OK.
- `npm run lint` : OK, 0 erreur et 2 warnings préexistants (`Link` non utilisé dans la page projet et `_err` non utilisé dans les notifications).
- `npm test -- --runInBand` : OK, 40 tests, dont absence de relation normalisée et repli legacy uniquement en cas d'erreur de lecture.
- `npx next build` : échec environnemental répété dans Turbopack lors du traitement CSS, avec un processus enfant qui se termine sans diagnostic applicatif.
- `npx next build --webpack` : échec environnemental, résolution DNS impossible pour `fonts.googleapis.com` (polices `next/font`), puis `EPERM` à la création de `.next/server/app/submit`. Build de production non confirmé.
- Vérification HTTP locale : `/` et `/?q=Photoshop` ont tous deux répondu `200`, le shell de la page était présent et le champ de recherche contenait `Photoshop` pour la seconde URL ; aucune soumission n'a été faite.
- La migration Replacing a été exécutée sur Supabase selon la confirmation de l'utilisateur. Pour les tags, l'utilisateur rapporte l'exécution de la migration de rattrapage puis du SQL manuel d'ajout approuvé. Le contrôle final fourni par le propriétaire indique 25 `ASSOCIATED`, 3 `UNCATALOGUED` (mcp sur SolidCraft, office sur OpenPlayground, test sur Test Submit 2), zéro `AMBIGUOUS` et zéro `MISSING_ASSOCIATION`. C'est un résultat communiqué par le propriétaire, non exécuté par l'agent.

Les contrôles TypeScript, lint et tests couvrent le code local. Ils ne prouvent ni l'application des migrations distantes ni le fonctionnement contre le projet Supabase réel.

## 8. Liens et sécurité

- Ne jamais exposer de clé Supabase service-role ou autre secret côté navigateur.
- Ne jamais exécuter automatiquement le code d'un dépôt soumis.
- L'approbation d'une fiche ne garantit pas que le code du projet est sûr.
- Les badges « officiel » et « vérifié » doivent être réservés aux personnes autorisées.
- Les données de démonstration doivent être clairement identifiées et ne pas être confondues avec des projets réels.

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

## 11. Tags — état après vérification post-rattrapage
- [x] Les tables `tags`, `tag_aliases` et `project_tags` existent dans Supabase et RLS est activé sur chacune (vérification rapportée par l'utilisateur).
- [x] Le backfill SQL est ponctuel et ne synchronise pas les nouvelles soumissions ; le formulaire et l'API ont été corrigés localement pour accepter uniquement les tags canoniques/alias déjà présents.
- [x] L'utilisateur rapporte avoir exécuté manuellement `supabase/migrations/20261016_reconcile_known_project_tags.sql`. Cette migration associe uniquement les tags canoniques ou alias déjà existants ; elle ne crée aucun tag public à partir de texte libre historique. Aucune migration n'a été lancée par l'agent.
- [x] Résultat intermédiaire après migration de rattrapage, rapporté par le propriétaire : 17 associations `ASSOCIATED`, 11 `UNCATALOGUED`.
- [!] La version initiale de `20261015_normalize_tags_and_categories.sql` insérait automatiquement toutes les valeurs historiques dans le catalogue actif. Le fichier local a été corrigé pour les prochaines exécutions : il ne crée plus de tags depuis `projects.tags`. Cette modification locale ne retire ni ne désactive les lignes déjà créées sur une base distante ; leur statut doit être vérifié avant de les considérer comme approuvées.
- [x] Le propriétaire a validé `3D Modeling` (alias `3d-modeling`), `CAD`, `BREP`, `STEP`, `egui`, `WebAssembly` (alias `wasm`) et `Web`. Ne pas créer `test`, `mcp` ni `office`.
- [x] Le propriétaire rapporte avoir exécuté `supabase/manual/approve_validated_tags.sql`. Le fichier ajoute uniquement les sept tags approuvés, les alias `3d-modeling` et `wasm`, puis les liens legacy correspondants ; il ne modifie ni `projects.tags` ni les fiches projet.
- [x] Contrôle final en lecture seule fourni par le propriétaire : 25 lignes `ASSOCIATED`, 3 `UNCATALOGUED` (mcp pour SolidCraft, office pour OpenPlayground, test pour Test Submit 2), aucune `AMBIGUOUS` ni `MISSING_ASSOCIATION`. Ce résultat est rapporté par le propriétaire, pas exécuté par l'agent.
- [x] `test` reste non catalogué selon ce résultat ; aucune suppression n'a été nécessaire ni effectuée. Les valeurs legacy et la fiche Test Submit 2 sont préservées. Le contrôle en lecture seule `supabase/manual/check_temporary_test_tag.sql` reste disponible si nécessaire.
- [ ] Vérifier la modération de `SolidCraft`, `OpenPlayground` et `Test Submit 2` avec `supabase/manual/check_named_project_moderation.sql` ; cette vérification distante n'a pas été exécutée par l'agent.
- [x] `projects.tags` est conservé comme compatibilité legacy ; mcp, office et test restent non catalogués volontairement.

Le jeu de tags approuvé et ses associations sont rapportés appliqués et vérifiés. Les trois valeurs non cataloguées restent une limite connue et volontaire. Arrêter ici ; ne commencer ni demandes de collaboration, ni projets similaires, ni autre étape sans autorisation explicite du propriétaire.
