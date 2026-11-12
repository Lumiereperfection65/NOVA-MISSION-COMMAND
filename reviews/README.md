# Pipeline de revue de code — NOVA MISSION COMMAND

## Objectif
Garantir qu'aucune branche métier n'arrive directement sur `main`. Chaque branche fait l'objet d'une revue indépendante, tracée dans un journal, avant d'être intégrée dans `review/validation`, puis dans `main`.

## Hiérarchie des branches
- `main` → branche de production
- `review/validation` → branche de revue commune
- `review/<nom-de-branche>` → branche temporaire de revue d'une fonctionnalité
- `fix/review/<nom-de-branche>` → branche de correctif liée à une erreur trouvée

## Pipeline en une ligne
branches métier → branche de revue dédiée → validation automatique → revue humaine → correctif si besoin → blog des erreurs et correctifs → merge dans `review/validation` → merge final dans `main`

## Journaux de revue
Chaque revue fait l'objet d'un fichier dans `reviews/review-log/review-<branche>.md` contenant :
- nom de la branche
- date de la revue
- erreurs détectées
- correctifs appliqués
- tests automatiques
- revue humaine
- verdict final (accepté / accepté après correctif / refusé)

## Règles de gouvernance
- Aucune branche métier n'est fusionnée directement dans `main`.
- Une branche de revue doit être ouverte pour chaque branche métier.
- Les correctifs ne sont pas faits directement sur la branche source.
- Chaque correction est journalisée.
- Chaque branche a un verdict clair.