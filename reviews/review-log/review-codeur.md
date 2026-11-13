# Review log — codeur

## Branche
origin/codeur

## Date
2026-11-13

## Domaine
frontend / Mission Builder

## Erreurs détectées
1. [Processus] La branche est basée sur le commit `c8ede26`, un ancêtre de `main` (actuel : `fc495fb`). Une fusion directe vers `main` risque des conflits car `main` contient déjà les mêmes fichiers frontend (apportés par le pull récent).
2. [Tests] Aucun test automatisé (unitaire / E2E) n'est ajouté pour le frontend Mission Builder. Pas de fichier de test dans le commit.
3. [Qualité] Aucune configuration de lint / TypeScript strict n'est vérifiable localement (pas de `node_modules`, pas de script de build exécuté). La compilation n'a pas été testée.
4. [Runtime] `page.tsx` appelle `fetch(`${API_BASE_URL}/api/simulate`)` avec une charge en dur (`missionName`, `destination`, etc.) plutôt que les valeurs du formulaire. C'est un test manuel, pas une intégration réelle avec le Mission Builder.

## Correctifs appliqués
Aucun correctif appliqué sur la branche à ce stade (revue en cours).

## Tests automatiques
- Tests backend (`pytest backend/tests tests`) : 39 passed sur `main` (déjà validé).
- Tests frontend : **aucun** dans le commit `codeur`. Non applicable / non couvert.

## Revue humaine
- Architecture : Mission Builder multi-étapes bien découpé (Mission > Spacecraft > Launcher > Payload > Review & Launch). Séparation claire entre `types.ts`, `catalog.ts`, `validation.ts`, `api.ts` et les composants React.
- Cohérence des endpoints : le frontend appelle `/api/catalog/launchers`, `/api/catalog/instruments`, `/api/simulate` — ces endpoints existent sur le backend FastAPI (branche `main`).
- Cohérence des schémas : les types TypeScript (`MissionRequest`, `SimulationResult`) mirrorent le backend et le moteur de simulation (`simulation/engine.py`). Le fallback local `estimateLocally` réimplémente les mêmes règles que `run_full_simulation`.
- Qualité du code : imports cohérents (`@/lib/mission/*`, `./components/mission-builder/*`), gestion d'erreur API (`ApiHttpError`, timeout, AbortController), fallback local si le backend est hors ligne, persistance du brouillon dans `localStorage`.
- Sécurité : validation des entrées dans `validateMission` (nom, objectifs, destination, durée, masse, puissance, budget). Messages d'erreur clairs et actionnables.
- Accessibilité / ARIA : rôles `alert`, `meter`, `aria-valuemin/max/now` présents sur les jauges de contrainte.

## Verdict
**Accepté après correctif**

La branche est fonctionnelle et bien conçue, mais ne peut pas être mergée directement vers `main` tant que :
1. Le rebase sur `main` n'est pas effectué (résolution des conflits de fichiers frontend),
2. Au moins un test unitaire frontend est ajouté (validation, contrainte, ou build).

## Recommandation avant merge
`git checkout codeur` → `git rebase main` → résoudre les conflits → ajouter des tests → pousser → ouvrir une PR vers `main`.