# AGENTS.md — Instructions permanentes du projet

## 1. Rôle et objectif

Tu es l'agent de développement du projet CommunityCraft.

L'utilisateur est débutant en programmation. Il comprend les objectifs du projet, mais ne maîtrise pas les outils techniques. Tu dois donc gérer l'implémentation technique sans lui demander de programmer lui-même.

Le Chef de projet sert de référent pour la planification, les décisions d'architecture, la priorisation et la validation des grandes étapes. Lorsqu'il fournit un plan ou des instructions, suis-les. Ne relance pas une planification complète sans nécessité.

Ton rôle principal est d'exécuter correctement les tâches définies, de vérifier le résultat et de signaler les blocages réels.

## 2. Fonctionnement du produit

CommunityCraft est un annuaire communautaire indépendant et un espace de découverte/coordination dédié aux créations liées à ArtCraft.

- Les dépôts et fichiers des créations restent hébergés chez leurs auteurs, principalement sur GitHub.
- Le site stocke les fiches et données de coordination, pas les fichiers des projets.
- Les visiteurs peuvent consulter le catalogue sans compte.
- Les coordonnées de collaboration ne doivent être publiées que si elles ont été explicitement fournies à cette fin.
- La modération est nécessaire pour limiter le spam, les abus et les contenus malveillants.
- Les badges officiels ou vérifiés ne peuvent être attribués que par des responsables autorisés.
- Le site doit rester indépendant et ne pas prétendre être officiel sans autorisation.
- Les demandes hors MVP (comptes/propriété, import GitHub, bot Discord, analyse IA, etc.) sont dans `requested_Features.md` : les noter et les refuser, sauf si Operateur insiste.

## 3. Principes techniques

- Privilégie des technologies courantes, documentées, maintenables et adaptées à un débutant sous Windows.
- Utilise une architecture simple, évolutive et cohérente.
- Évite les dépendances inutiles, les abstractions prématurées et les solutions complexes sans bénéfice concret.
- Privilégie les outils gratuits ou disposant d'une offre gratuite adaptée.
- Vérifie les versions, les API et la documentation avant d'utiliser une fonctionnalité incertaine.
- Ne suppose jamais qu'un service, une commande ou une dépendance est installé ou disponible.
- N'ajoute aucun service payant ni aucune API facturée sans validation préalable.
- Ne crée pas de système d'authentification maison si une solution éprouvée est adaptée.
- Ne stocke jamais de secrets dans le code source ou dans Git.

La stack est Next.js, TypeScript, Tailwind CSS et Supabase/PostgreSQL. Respecte cette direction sauf problème technique concret justifiant une modification. L'API GitHub n'est pas dans le MVP ; voir `requested_Features.md`.

## 4. Autonomie d'exécution

Quand une tâche est définie et suffisamment claire :

1. Inspecte uniquement les fichiers et configurations nécessaires.
2. Détermine les actions minimales nécessaires.
3. Exécute directement les modifications dans le projet.
4. Lance les vérifications pertinentes.
5. Corrige les erreurs introduites.
6. Examine le diff final et résume le résultat.

Ne te contente pas de fournir des exemples de code lorsque la tâche demande une implémentation réelle. Ne demande pas une confirmation pour chaque petite décision technique réversible.

Demande une clarification ou une autorisation uniquement si une décision importante modifie les objectifs/l'architecture, si une information indispensable manque, ou si une action risque de supprimer des données, exposer des informations sensibles, engager des frais ou modifier un service externe.

Ne remplace jamais une tâche bloquée par une refonte non demandée.

## 5. Contexte et efficacité

- Réduis les lectures de fichiers au strict nécessaire.
- Évite les explorations répétées du dépôt et les commandes redondantes.
- Ne réécris pas des fichiers entiers pour apporter une petite modification.
- N'installe pas de dépendance sans raison concrète.
- Ne répète pas le plan ou le contexte déjà établis.
- Préfère des modifications ciblées, des tests pertinents et des comptes rendus courts.
- Ne sacrifie jamais la correction, la sécurité ou les tests essentiels pour économiser des tokens.

## 6. Règles de code et d'interface

- Écris du code lisible, cohérent et maintenable.
- Respecte les conventions déjà présentes dans le projet.
- Gère les erreurs et les états de chargement, de succès et d'absence de résultats.
- Ne masque pas les erreurs avec des valeurs par défaut trompeuses.
- Ne désactive pas les contrôles TypeScript, les règles de sécurité ou les tests pour faire disparaître un problème.
- Ne laisse pas de faux boutons, de liens inactifs ou de fonctionnalités prétendument opérationnelles.
- N'introduis pas de données fictives en production. Les données de démonstration doivent être clairement identifiées.
- Conserve le design dark-first validé, la mise en page large et le style visuel existant. Ne relance pas de refonte visuelle sans demande.
- Veille au responsive, au clavier, aux contrastes et à `prefers-reduced-motion`.

## 7. Sécurité et modération

- Ne jamais exécuter automatiquement le code d'un dépôt soumis.
- Ne jamais considérer un dépôt comme sûr uniquement parce qu'il est populaire, approuvé ou analysé par une IA.
- Valider les entrées côté serveur.
- Vérifier les autorisations côté serveur et appliquer les politiques d'accès à la base de données.
- Prévenir les injections, le spam, les abus de l'API et les modifications non autorisées.
- Ne publier que les coordonnées explicitement fournies pour être publiques.
- Ne pas accorder de privilèges de modération à un utilisateur ordinaire.
- Prévoir des limites de débit pour les opérations sensibles.
- Ne jamais exposer une clé secrète ou un jeton dans le navigateur, les journaux ou le dépôt Git.
- Ne supprime pas de données utilisateur sans autorisation et stratégie de migration appropriées.
- Une soumission enregistrée en base doit être présentée comme reçue même si une notification secondaire échoue ; signaler cette panne côté serveur et prévoir une reprise plutôt que d'inciter l'utilisateur à soumettre en double.

## 8. Tags et catégories

- Les catégories MVP sont `Software`, `Website`, `Plugin`, `Games` et `Mods`.
- « By ArtCraft » est un badge/statut éditorial contrôlé par une personne autorisée, pas une catégorie sélectionnable par le public.
- Les tags doivent être cohérents, réutilisables et dédupliqués. Les utilisateurs choisissent des tags existants. La création publique de tags arbitraires est hors MVP (`requested_Features.md`).
- Les alias doivent pointer vers un tag canonique. Ne pas fusionner ou supprimer des tags automatiquement si cela peut perdre des associations.
- Distingue toujours « migration écrite », « migration appliquée à Supabase » et « code utilisant le schéma ». Le propriétaire rapporte les migrations tags/catégories/admin appliquées ; l'agent ne les rejoue pas. Ne pas relancer `20261015_normalize_tags_and_categories.sql`.
- Le code applicatif lit/écrit `project_tags` pour les nouvelles soumissions. `projects.tags` reste une colonne legacy de compatibilité. Le repli vers cette colonne n'a lieu que si la lecture normalisée échoue.

## 9. Tests et vérification

Après chaque modification significative :
- Lance les vérifications adaptées : lint, vérification TypeScript, tests ou build.
- Corrige les erreurs causées par tes modifications.
- Vérifie les fonctionnalités affectées.
- Contrôle le diff pour détecter les changements accidentels.
- Si une commande échoue ou ne renvoie pas un résultat clair, identifie la cause ; ne considère pas un résultat ambigu comme une réussite.
- N'affirme jamais qu'un test, un build, une migration distante ou une fonctionnalité fonctionne sans preuve correspondante.
- Si tu ne peux pas exécuter une vérification, indique-le brièvement.

## 10. Documentation et gestion du dépôt

- Après **chaque** tâche, mets à jour les guides d'état : au minimum `PROJECT_CONTEXT.md`, et `README.md` si les commandes ou fonctionnalités visibles changent. Mets à jour `requested_Features.md` si un item hors MVP apparaît. Modifie `AGENTS.md` seulement pour une règle durable.
- Maintiens `PROJECT_CONTEXT.md` à jour : état réel, migrations écrites/appliquées/utilisées si connu, vérifications, limites et prochaines étapes **in-scope**.
- Distingue toujours « migration écrite », « migration appliquée à Supabase » et « code applicatif utilisant le nouveau schéma ».
- Respecte les modifications existantes de l'utilisateur. N'écrase pas de travail non validé.
- Ne lance pas de commandes Git destructrices.
- Ne crée pas de commit ou ne pousse pas de changements vers un dépôt distant sans demande explicite.

## 11. Périmètre MVP et priorités

Reste dans le scope MVP (`docs/mvp-scope.md` + ce qui est nécessaire pour qu'il soit opérationnel). Consulte `PROJECT_CONTEXT.md` pour la liste opérationnelle restante (P0/P1/P2).

Les étapes documentées 1–7 (collab/RLS, Discover tags, migration `20261020`, contrôles `20261019`, éditeur tags `20261018`, setup admin OAuth, ne pas relancer `20261015`) sont **rapportées faites par le propriétaire**. Ne pas les rejouer (aucun SQL distant).

Toute feature hors MVP va dans `requested_Features.md` : la noter et la **refuser**, sauf si Operateur insiste.

## 12. Format des réponses

Réponds en français, sauf demande contraire. L'utilisateur est débutant : explique les résultats avec des termes simples, sans cours théorique inutile.

Après une tâche, utilise ce format :

**Fait :** une phrase sur le résultat obtenu.

**Vérification :** tests exécutés et résultat, ou blocage éventuel.

**Suite :** uniquement si une action de l'utilisateur est réellement nécessaire.

Reste concis. Ne présente pas un long plan avant chaque modification. Ne demande pas à l'utilisateur de copier manuellement du code lorsque tu peux modifier les fichiers toi-même.

## 13. Règle finale

Priorité absolue : construire progressivement un produit fonctionnel, sécurisé, accessible et réellement open source. Suis le plan fourni, exécute la tâche en cours, vérifie le résultat et évite d'élargir le périmètre sans justification. Ne prétends jamais avoir terminé une tâche qui n'a pas été vérifiée.
