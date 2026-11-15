# Demonstration guide

## Purpose

This walkthrough demonstrates the implemented Mission Builder, its feasibility checks, and the live simulation response. All costs, launcher specifications, instrument values, and mission outputs below are illustrative project data, not official or operational mission figures.

## Before the demo

1. Follow [Installation](INSTALLATION.md) and start both development servers.
2. Open <http://localhost:3000>.
3. Confirm that the Mission Builder reports `API EN LIGNE`. If it reports offline mode, the application will show a browser-side estimate rather than the live API result.
4. If needed, check <http://localhost:8000/system/status>. The `simulation_engine` object identifies `live` versus `mock`.

## Mission Builder walkthrough

Use this repeatable configuration:

| Step | Selection |
| --- | --- |
| Mission | Name: `Lunar Explorer Alpha`; add one objective, e.g. “Map the lunar surface in high resolution”; destination: Moon |
| Mission parameters | Duration: 30 days; difficulty: Intermediate; budget: 300 M USD; altitude: 100 km; inclination: 45° |
| Spacecraft | SmallSat Explorer; set propellant to 400 kg |
| Launcher | Saturn-V Evo (the illustrative catalog entry) |
| Payload | High-Res Optical Camera and Infrared Spectrometer |
| Review | Check the mass, power, and budget constraints, then select **Lancer la simulation** |

The Builder is localized in French. Destination selection sets the suggested altitude and a minimum duration; the table above gives the final values to verify. The spacecraft selection initially sets its catalog propellant amount, so change it to 400 kg for this scenario.

With the current live engine and catalog values, the expected result is:

- **Mission status:** `SUCCESS`; **score:** `97.5`.
- **Total mass:** 590 kg against 45,000 kg of catalog payload capacity.
- **Total cost:** 234 M USD against 300 M USD allocated.
- **Power balance:** +145 W.
- **Orbit output:** 86.34 minutes and 7.848 km/s.
- **Communication estimate:** viable; 585.938 MB/day capacity against 400 MB/day estimated demand.
- **Risk level:** `MEDIUM`.

The UI shows the status, score, risk level, mass, capacity, cost, power balance, orbital period, and speed. Communication details are present in the API result but are not rendered in the current result card. The UI displays the launcher's catalog reliability, but the current Builder request omits it; the engine therefore treats reliability as unknown when calculating risk.

These expected values were produced by the live adapter with the current source code using the example configuration. A browser demo can differ if catalog values or the implementation change. A mock result is deliberately different and must remain labeled as mock.

## Quick engine check

The **Simulation** tab also contains a fixed quick-test request. It uses a 100 km orbit, a `Nova-1 Light` demonstration launcher configuration, and the optical camera plus infrared spectrometer. With the current live engine it returns:

- `SUCCESS`, score `97.5`
- 640 kg total mass and 134 M USD total cost
- +185 W power balance
- 86.34-minute orbital period and 7.848 km/s orbital speed

This is a convenient smoke demonstration, but it does not save a mission record.

## API demonstration (optional)

To show the request/response contract without the frontend:

1. Open <http://localhost:8000/docs>.
2. Expand `POST /api/simulate`.
3. Submit the payload from [API examples](API.md#direct-simulation).
4. Point out `mission_status`, the nested checks, warnings, `engine_mode`, and the `mock` boolean.
5. To demonstrate persistence separately, use `POST /missions` followed by `POST /missions/{mission_id}/simulate`; this is a different API flow from the Mission Builder.

## Suggested narration

1. Explain that this is a design/feasibility teaching prototype, not a trajectory planner.
2. Change one input, such as propellant mass, and show how the mass margin updates before launch.
3. Explain that the backend reruns checks and provides an explicit engine-mode label.
4. State that the score and risk are deterministic heuristics, not probabilities.
5. Close with the limitations in [Limitations](LIMITATIONS.md), especially the Earth-centered orbit approximation for the Moon scenario.
