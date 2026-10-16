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

Les vérifications locales ont été exécutées avec succès après l'intégration des tags normalisés :
- `npx tsc --noEmit` : OK
- `npm run lint` : OK au niveau erreurs ; 2 warnings de code existant non bloquants (`Link` non utilisé, variable `_err` non utilisée)
- `npx next build` : OK
- `npm test -- --runInBand` : 23 tests OK

L’environnement local ne permet pas de valider la migration en base réelle distante ; la vérification ci-dessus couvre le code applicatif et les tests, pas une exécution SQL réelle sur Supabase.

## 8. Liens et sécurité

- Ne jamais exposer de clé Supabase service-role ou autre secret côté navigateur.
- Ne jamais exécuter automatiquement le code d'un dépôt soumis.
- L'approbation d'une fiche ne garantit pas que le code du projet est sûr.
- Les badges « officiel » et « vérifié » doivent être réservés aux personnes autorisées.
- Les données de démonstration doivent être clairement identifiées et ne pas être confondues avec des projets réels.

## 9. Projets similaires et sélection de tags — améliorations live
- [x] La logique des projets similaires a été affinée pour privilégier les tags partagés réels, avec un bonus supplémentaire si la catégorie est identique et un léger bonus si le statut correspond.
- [x] Le score reste simple et explicite : une ou plusieurs tags communes comptent plus qu'un simple partage de catégorie, tout en conservant un fallback si aucune relation forte n'est détectée.
- [x] Le formulaire de soumission inclut désormais un sélecteur multi-tags searchable, navigable au clavier, avec déduplication et suggestions issues des tags canoniques et alias connus.
- [x] Les suggestions de tags restent lisibles en cas d'absence de correspondance et évitent de créer des tags arbitraires au moment de la saisie.
- [x] La compatibilité legacy `projects.tags` est conservée ; la liste soumise reste envoyée au backend sans créer de nouvelle migration ni modifier les données distantes.
