# Review log — feat/simulation-engine-4

## Branche
origin/feat/simulation-engine-4

## Date
2026-11-12

## Domaine
backend / simulation

## Erreurs détectées
1. [Backend] L'adaptateur `NovaMissionSimulationAdapter` ne transmettait pas les paramètres `communication` et `resources` au moteur `MissionSimulation`. Les contraintes de communication (downlink, data volume, ground stations) et la réserve budgétaire étaient donc ignorées via l'API.
2. [Architecture] Risque d'import circulaire entre `simulation/__init__.py` et `simulation/engine.py` : `__init__` faisait un import eager de `engine`, qui à son tour faisait `from simulation import ...` pendant l'initialisation du package.
3. [Processus] La branche n'est pas basée directement sur `main` mais sur `feat/backend-api-postman-readiness`, ce qui peut introduire des dépendances indésirables avant le merge final.

## Correctifs appliqués
1. `backend/app/services/engines/nova_engine.py` : ajout de `communication=configuration.get("communication")` et `resources=configuration.get("resources")` dans l'appel au constructeur `MissionSimulation`.
2. `simulation/__init__.py` : remplacement de l'import eager par un import lazy via `__getattr__` (PEP 562). L'import de `MissionSimulation` reste fonctionnel (`from simulation import MissionSimulation`), mais la boucle circulaire est rompue.
3. Recommandation : rebaser la branche sur `main` avant son intégration dans `review/validation`.

## Tests automatiques
- `pytest tests/test_simulation.py` : **17 passed** (succès, échec masse, échec puissance, échec budget, réserve budgétaire, orbite LEO/GEO, communication, configurations invalides, méthodes legacy).
- Import du package `simulation` vérifié : aucune erreur d'import circulaire.

## Revue humaine
- Architecture : package modulaire bien découpé (`mass`, `power`, `budget`, `orbit`, `comms`, `risk`, `validation`, `models`, `engine`). Séparation des préoccupations respectée.
- Cohérence : le façade `MissionSimulation` délègue correctement vers les modules spécialisés ; l'adaptateur backend consomme le moteur sans le modifier.
- Conventions : nommage snake_case, docstrings, type hints présents. Code lisible et fonctions courtes.
- Sécurité : validation défensive des entrées (jamais d'exception levée sur configuration invalide), retour de statut `INVALID` structuré.
- Qualité : bon usage de helpers partagés (`coerce_float`, `make_check`, `margin_pct`) dans `simulation/models.py`.

## Verdict
**Accepté après correctif**

La branche est prête à être intégrée dans `review/validation` une fois rebase sur `main` effectué.