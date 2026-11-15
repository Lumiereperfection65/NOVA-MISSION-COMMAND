# Limitations and future work

## Current limitations

### Scientific fidelity

- The orbit module uses a circular two-body Earth model with fixed Earth constants. It does not model transfer trajectories, orbital maneuvers, perturbations, target-body gravity, eclipses, launch windows, or landing. Destination is descriptive input; the engine does not switch celestial-body models. A “100 km lunar orbit” is therefore evaluated with Earth constants.
- Orbit period and speed ignore inclination. Orbit-regime and radiation labels use altitude thresholds, not ephemerides, radiation-belt models, shielding, or a validated environment model.
- Communication is a rule-of-thumb capacity estimate based on orbit-altitude bands, fixed contact times, a fixed default downlink rate, and estimated data volume. It does not calculate link budgets, antenna geometry, ground-station visibility, coding, or link margin.
- Power is a steady-state generation-minus-load check. It omits orbit eclipse, storage, degradation, duty cycles, and thermal interactions.
- Risk and score are hand-authored heuristics, not calibrated reliability or success-probability estimates. A mission can be marked `SUCCESS` while communications are non-viable or risk is elevated because communications/risk do not gate the final status.

### Data and configuration

- Launcher, instrument, spacecraft, cost, utility, and reliability catalog entries are hard-coded demonstration values. Some launcher names are fictional. No source citations or data provenance are supplied.
- The Mission Builder has local destination and spacecraft catalogs, while launcher and instrument catalogs are fetched from the backend when possible. There is no catalog administration or catalog API for destinations/spacecraft.
- The Builder displays launcher reliability but omits it from its direct simulation payload, so the engine receives no reliability input on that path. The current risk score uses the unknown-reliability penalty.
- The Builder does not expose communication or budget-reserve settings. Persisted mission configurations can include extra communication/resources keys, but the legacy direct simulation conversion drops those optional blocks.
- Browser-side offline estimates use separate scoring/output logic and cover fewer result fields than the live Python engine. Offline results must not be presented as backend or live-engine output.
- The mock adapter checks only mass and budget. It is a fallback for API availability, not a substitute for the full simulation.

### Product completeness

- Mission Builder drafts are stored in browser `localStorage`; there is no sign-in, synchronization, or server-side save from the Builder. The API's mission CRUD workflow exists but is not connected to the Builder.
- Dashboard activity entries, active-mission/team counts, and decorative telemetry are seeded or fixed demo UI values. They are not database-backed operational data.
- The Team and Resources tabs are “Coming soon” placeholders. There is no implemented Gemini/AI advisor, live mission monitoring, or spacecraft command/control.
- The interface is French; the technical documentation is English.
- No screenshot assets were present in the repository when this documentation was prepared, so the guides do not embed images.
- `frontend/package.json` has no frontend test script or dependency lockfile. The existing frontend test is run directly with Node's test runner.

## Safety and interpretation

Do not use the project to make launch, spacecraft design, budget approval, or operational decisions. Treat all outputs as educational examples. The NASA Space Apps Challenge reference describes the project context and does not imply NASA endorsement or provision of the catalogs.

## Practical next steps

1. Add data provenance, units, uncertainty, and validated domain references for every catalog value; separate fictional demonstration entries from sourced values.
2. Fix the Builder's reliability omission and expose typed communication and reserve settings consistently in both request contracts.
3. Align live, mock, and offline result schemas, make mode/source visible wherever a result is shown, and make the live engine's feasibility rules explicit to users.
4. Add destination-aware orbit models and appropriately validated link, power, mass-growth, and risk calculations before claiming higher-fidelity analysis.
5. Connect Builder saves and dashboard metrics to the persisted Mission API; replace seeded cards with clearly labeled empty/live states.
6. Add a lockfile, a documented supported toolchain, frontend build/type-check checks, and automated end-to-end coverage for the full Builder-to-API flow.
7. Add screenshots only after capturing the current application and verifying that each image reflects the released UI.
