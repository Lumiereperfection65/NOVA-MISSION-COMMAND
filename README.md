# NOVA MISSION COMMAND

**An educational space-mission planning and feasibility prototype**
**NASA Space Apps Challenge 2026 project — Nova Tech Africa, Pointe-Noire, Republic of the Congo**

NOVA MISSION COMMAND lets a user assemble a notional spacecraft mission and evaluate a small set of engineering constraints. The Next.js interface provides a five-step Mission Builder; a FastAPI service validates simulation inputs and runs the repository's deterministic Python simulation engine. Results are illustrative and are not operational mission analysis.

For the 2026 challenge, the project aims to make mission trade-offs approachable through a hands-on, browser-based planning workflow. Its design contribution is the transparent combination of modular constraint checks and clear live/mock/offline result labeling—not a claim of novel or flight-validated science.

This is a team project for the NASA Space Apps Challenge. It is not a NASA product, and the demonstration catalogs and cost/reliability values are not official NASA data.

## What is implemented

- A browser dashboard and five-step Mission Builder for mission objectives, destination, duration, orbit inputs, spacecraft bus, propellant, launcher, instruments, budget, and pre-launch checks.
- Local draft persistence in the browser's `localStorage`.
- A live FastAPI backend with mission CRUD, launcher and instrument catalog endpoints, health/status endpoints, and two simulation routes.
- A modular simulation engine with mass, power, budget, simplified Earth-orbit, communication-capacity, risk-heuristic, and configuration-validation calculations.
- A browser-side feasibility estimate when the backend cannot be reached, plus an explicitly labeled backend mock adapter if the live engine cannot be loaded or is explicitly disabled.

The Mission Builder sends its simulation to `POST /api/simulate`; it does not create a persisted mission record. The separate `/missions` API supports persistence and saved simulation results. Dashboard activity, team counts, and some status cards are static demonstration content, not live mission telemetry. No AI advisor is currently implemented.

## Quick start

Use Python 3.12 and Node.js 18.17 or later. Run installation and start scripts from the repository root.

### Windows (PowerShell)

Ensure `python --version` resolves to Python 3.10–3.12 and Node.js/npm are on `PATH`. If PowerShell blocks local scripts, allow them for the current PowerShell process only:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\install_windows.ps1
.\start_windows.ps1
```

### Linux / macOS

Ensure `python3 --version` resolves to Python 3.10–3.12 and Node.js/npm are installed:

```bash
bash install_unix.sh
bash start_unix.sh
```

Open the frontend at <http://localhost:3000>. The API is at <http://localhost:8000>, with interactive documentation at <http://localhost:8000/docs>.

The scripts install backend and frontend dependencies and initialize the SQLite database. See [Installation](docs/INSTALLATION.md) for manual setup, standalone backend instructions, environment variables, and troubleshooting.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — runtime components and data flow
- [Installation](docs/INSTALLATION.md) — Windows, Linux, and macOS setup
- [Simulation engine](docs/SIMULATION_ENGINE.md) — calculations, result fields, and a worked result
- [API reference](docs/API.md) — endpoints, request examples, and response/error contracts
- [Demo guide](docs/DEMO_GUIDE.md) — a repeatable Mission Builder walkthrough
- [Limitations and roadmap](docs/LIMITATIONS.md) — current gaps and practical next steps

## Tests

From the repository root, after installing the dependencies:

```powershell
.\venv\Scripts\python.exe -m pytest backend\tests tests
node --test frontend\src\lib\mission\errors.test.mjs
```

On Linux/macOS:

```bash
./venv/bin/python -m pytest backend/tests tests
node --test frontend/src/lib/mission/errors.test.mjs
```

The Python tests use isolated temporary SQLite databases. The frontend test file uses Node's built-in test runner and requires Node.js 22.18+ or 23.6+ for TypeScript type stripping; running the Next.js app itself requires Node.js 18.17+.

## Project status

The interface is currently French, while this README and the technical guides are in English. Catalog values are illustrative, the dashboard is partly seeded, and the orbit and communications models are deliberately simplified. Consult [Limitations](docs/LIMITATIONS.md) before interpreting results.
