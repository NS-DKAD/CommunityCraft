# requested_Features.md — Hors périmètre MVP

Les demandes **non nécessaires** au MVP sont listées ici.  
**Règle :** les noter dans ce fichier et **les refuser**, sauf si Danny insiste explicitement.

Le MVP est défini par `docs/mvp-scope.md` plus ce qui est indispensable pour qu’il soit opérationnel (catalogue, soumission, tags/catégories, collab, signalements, panel admin, projets similaires, Replacing).

## Règle d’agent

1. Si une demande n’est pas dans le MVP et n’est pas requise pour le faire fonctionner : l’ajouter ici (si absente) et refuser.
2. Ne l’implémenter que si Danny insiste après ce refus.
3. Ne pas dupliquer de longs plans hors scope dans `README.md`, `AGENTS.md` ou `PROJECT_CONTEXT.md`.

## Items extraits des guides (2026-10-17)

| Item | Source | Statut |
|---|---|---|
| Comptes utilisateurs et gestion de propriété des projets | `AGENTS.md`, `PROJECT_CONTEXT.md` | Reporté / hors MVP |
| Import massif GitHub | `AGENTS.md`, `PROJECT_CONTEXT.md` | Reporté ; à autoriser |
| Actualisation automatique des métadonnées GitHub / API GitHub | `AGENTS.md`, `PROJECT_CONTEXT.md` | Reporté ; à autoriser si nécessaire plus tard |
| Bot Discord | `PROJECT_CONTEXT.md` | Reporté ; à autoriser |
| Analyse des dépôts par IA | `AGENTS.md` | Hors MVP (futur, notamment Team ArtCraft) |
| Téléchargement de plugins | `docs/mvp-scope.md` | Hors MVP (le catalogue peut seulement **référencer** des plugins) |
| Création publique de tags arbitraires | `AGENTS.md`, `PROJECT_CONTEXT.md` | Hors MVP ; interdit sans décision produit explicite |
| « By ArtCraft » comme catégorie sélectionnable | `AGENTS.md`, `PROJECT_CONTEXT.md`, `README.md` | Hors MVP / interdit : badge éditorial réservé, jamais une catégorie |
| Pagination admin au-delà des 500 fiches/demandes/signalements les plus récents | `README.md`, `PROJECT_CONTEXT.md` | Reporté (évolution de capacité) |
| Actions groupées (sélection multi-cartes), archivage de masse, suppression définitive | `PROJECT_CONTEXT.md` | Reporté ; à autoriser. Préférer l’archivage réversible. Pas de suppression dure sans confirmation, aperçu d’impact, admin et audit |
| Écran d’administration du catalogue d’applications Replacing | `PROJECT_CONTEXT.md` | Reporté ; ajouts via SQL contrôlé |
| Toast / barre d’action globale sur le **site public** (hors barre admin de sauvegarde groupée) | `PROJECT_CONTEXT.md` | Reporté (confort) |
| Possibilité de réactiver d'anciens fils archivés pour éviter les doublons | Demande Danny (2026-10-17) | Reporté / hors MVP (threads/discussions communautaires) |
| Photos de profil sur les cartes à côté du nom de l'auteur | Demande Danny (2026-10-17) | Reporté / hors MVP (avatars distants/GitHub) |
| Noms des collaborateurs principaux sur les cartes (en plus du fondateur) | Demande Danny (2026-10-17) | Reporté / hors MVP (gestion d'équipe détaillée sur les cartes) |

Ne pas traiter ces items comme des tâches MVP courantes.
