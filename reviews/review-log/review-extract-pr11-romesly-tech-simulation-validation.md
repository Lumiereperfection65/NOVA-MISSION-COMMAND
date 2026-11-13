# Review log — extract/pr11-romesly-tech-simulation-validation (PR #11)

## Branche
origin/extract/pr11-romesly-tech-simulation-validation

## Date
2026-11-13

## Domaine
backend / simulation API validation

## Erreurs détectées
Aucune erreur fonctionnelle détectée.

Le travail de la PR #11 (`fix(backend): validate legacy simulation requests`) est propre :
- Les schémas Pydantic rejettent les valeurs non finies (NaN, Infinity) sur `POST /api/simulate`
- Les blocs `spacecraft`, `launcher`, `orbit` sont typés et requis ; `instruments` doit contenir au moins un élément
- Les erreurs de validation retournent un HTTP 422 avec un corps structuré `{"error": {"code", "message", "details"}}` et jamais un HTTP 500
- Le schéma `LegacySimulationRequest` préserve le contrat frontend existant (`extra="allow"`) tout en ajoutant la validation stricte

## Correctifs appliqués
Aucun correctif nécessaire. Le code est prêt tel quel.

## Tests automatiques
- `backend/tests/test_simulate_validation.py` : 156 lignes, tests de régression pour l'anomalie B1
- 18 cas d'erreur couverts (types invalides, valeurs négatives, champs manquants, blocs vides, NaN, plage hors bornes)
- Tests backend existants sur `main` : 39 passed (déjà validés)

## Revue humaine
- Architecture : schémas Pydantic bien découpés, héritage des configs existantes (`SpacecraftConfig`, `LauncherConfig`, `OrbitConfig`), conversion vers `MissionConfiguration` via `to_configuration()`
- Cohérence : `LegacySimulationRequest` s'aligne sur le payload frontend existant et les types backend
- Sécurité : rejet des NaN/Infinity (`allow_inf_nan=False`), validation des plages (`ge=1`, `gt=0`, `min_length=1`), pas de fuite d'exception serveur
- Qualité : tests paramétrés, `details` pointant vers le champ offensant, code lisible et documenté

## Verdict
**Accepté**

La branche est prête à être intégrée dans `review/validation`, puis dans `main`, selon la pipeline de revue.