# Simulation engine

## Scope

`simulation/engine.py` exposes `MissionSimulation`, a deterministic facade over the modules in `simulation/`. The live backend adapter loads this engine; the mock adapter is separate and deliberately marked in its results. The engine is a feasibility-oriented teaching model, not a flight dynamics or mission assurance tool.

The full run validates the configuration first. Invalid input returns `mission_status: "INVALID"` and structured feasibility errors. A valid configuration is evaluated for mass, power, budget, orbit, communication capacity, and a heuristic risk level.

## Calculations

All monetary amounts are in millions of US dollars (`M USD`); masses are kilograms, power is watts, and orbit altitude is kilometres.

### Mass and launcher compatibility

```text
total mass = spacecraft dry/base mass + propellant mass + sum(instrument masses)
mass margin = launcher payload capacity - total mass
```

The mass check passes when total mass does not exceed the launcher's declared payload capacity. The percentage margin is relative to that capacity. This is a simple payload check; it does not model adapters, fairings, staging, trajectory-dependent performance, or mass growth.

### Power balance

```text
total draw = spacecraft bus draw + sum(instrument power draw)
power balance = solar generation - total draw
```

The check passes when the balance is non-negative. No eclipse periods, battery storage, degradation, thermal constraints, or duty cycles are simulated.

### Budget

```text
total cost = spacecraft cost + launcher cost + sum(instrument costs)
usable budget = allocated budget × (1 - reserve percentage / 100)
```

The optional `resources.budget_reserve_pct` input is clamped to 0–90%; the default is 0%. The budget check passes when total cost is within the usable budget. Costs are illustrative inputs, not sourced estimates.

### Orbit

`simulation/orbit.py` uses a circular, two-body Earth model with `mu = 398600.4418 km³/s²` and Earth radius `6371 km`. For radius `r = Earth radius + altitude`:

```text
period = 2π × sqrt(r³ / mu)
circular speed = sqrt(mu / r)
```

The engine labels orbit regimes from altitude (`LEO`, `MEO`, `GEO`, or `HEO`) and assigns a coarse radiation category from altitude alone. Inclination is returned but does not affect the period or velocity calculation.

### Communication capacity

The communication module uses a hard-coded rate and contact-time estimate for each altitude band, multiplied by the number of ground stations. If no volume is specified, required data is estimated as 200 MB per instrument per day. Capacity is estimated as:

```text
daily capacity (MB) = downlink rate (kbps) × contact seconds / 8 / 1024
```

Optional engine inputs are `communication.downlink_kbps`, `communication.data_volume_mb`, and `communication.ground_stations`. These are not controls in the current Mission Builder. The persisted mission configuration accepts additional configuration fields; the legacy direct endpoint currently does not forward these optional blocks to the engine.

### Risk and score

Risk is a weighted heuristic using mass, power, and budget margins; optional launcher reliability; the categorical radiation level; and communication viability. It returns a `risk_score` from 0 to 100 and `risk_level` of `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.

The mission `score` is another heuristic: it starts at 50 for a successful mission or 20 otherwise, adds up to 20 points for mean instrument utility, and adds up to 15 points each for mass and power margin. Neither score is a probability of mission success.

The overall engine mission status depends on mass compatibility, power viability, and budget feasibility. Communication failure and risk warnings do not, on their own, change a valid mission to `FAILED`; they are reported separately.

## Inputs and result shape

The core configuration includes:

- `spacecraft`: `base_mass`, `fuel_mass`, `solar_power_generation`, `base_power_consumption`, `cost`
- `instruments`: one or more objects with `name`, `mass`, `cost`, `power_consumption`, and `utility_score`
- `launcher`: `payload_capacity`, `cost`, optionally `name` and `reliability`
- `orbit`: `altitude_km`, `inclination_deg`
- `budget_allocated`

The live engine result includes `mission_status`, `score`, total mass/cost, a power balance, orbit values, recommendations, checks and warnings, detailed mass/budget/communication calculations, risk indicators, and feasibility information. The API adds `engine_name`, `engine_mode`, and `mock`; mock output also includes a disclaimer. See [API](API.md) for route-specific response envelopes.

## Reproducible worked scenario

This configuration matches the Mission Builder's lunar demonstration when the backend catalogs are reachable:

| Input | Value |
| --- | ---: |
| Spacecraft | SmallSat Explorer |
| Dry mass / propellant | 150 kg / 400 kg |
| Solar generation / bus draw | 250 W / 50 W |
| Spacecraft cost | 50 M USD |
| Instruments | High-Res Optical Camera; Infrared Spectrometer |
| Instrument mass / draw / cost | 40 kg / 55 W / 34 M USD combined |
| Launcher | Saturn-V Evo (illustrative catalog entry) |
| Payload capacity / cost | 45,000 kg / 150 M USD |
| Orbit | 100 km altitude, 45° inclination |
| Allocated budget | 300 M USD |

The live engine returned the following when this exact configuration was sent through `POST /api/simulate` with the live adapter:

| Result | Value |
| --- | ---: |
| Mission status / score | `SUCCESS` / 97.5 |
| Total mass / launch capacity | 590 kg / 45,000 kg |
| Total cost / allocated budget | 234 M USD / 300 M USD |
| Power balance | +145 W |
| Orbit period / circular speed | 86.34 min / 7.848 km/s |
| Communication estimate | 585.938 MB/day capacity vs 400 MB/day required |
| Risk level | `MEDIUM` |

These are deterministic outputs from the repository's current formulas, not real mission predictions or measured data. The Builder currently omits launcher reliability from its direct simulation request even though it displays a catalog reliability value; the engine therefore treats reliability as unknown and applies the corresponding risk penalty.

## Mock and offline behavior

- **Live adapter:** runs `simulation/engine.py` and reports `mock: false`.
- **Mock adapter:** selected with `SIMULATION_FORCE_MOCK=true` or when the live engine cannot be imported. It only compares the mass against payload capacity and total cost against the budget; it does not reproduce the live power, orbit, communications, or risk analyses. Responses include `mock: true` and a disclaimer.
- **Browser offline estimate:** used by the Mission Builder when the backend cannot be reached. It applies local mass/power/budget checks and a separate score calculation. It is not the mock adapter and does not provide equivalent engine results.

Always inspect the source/mode label before presenting a result.
