# NOVA MISSION COMMAND
**NASA Space Apps Challenge 2026**  
**Team:** Nova Tech Africa (Pointe-Noire, Republic of the Congo)  

## Overview
NOVA MISSION COMMAND is a comprehensive space mission design and simulation software built for the NASA Space Apps Challenge 2026. It empowers users to design, configure, launch, and monitor full-scale space missions with realistic physics, orbital mechanics, budget calculations, and spacecraft architecture.

## Features
- **Dashboard:** Futuristic mission telemetry and statistics.
- **Mission Builder:** Set mission objectives, destinations, and parameters.
- **Spacecraft & Instrument Lab:** Configure hull, mass, power systems, and scientific instruments.
- **Launch Vehicle Selector:** Choose optimal boosters with payload limits and costs.
- **Orbit Simulator:** Interactive orbital mechanics and trajectory calculations.
- **Simulation Engine:** Robust Python backend calculating mass, power budgets, and success probabilities.
- **Gemini AI Advisor:** Optional AI recommendations and error diagnosis.

## Quick Start (Windows)
1. Run `install_windows.ps1` in PowerShell.
2. Run `start_windows.ps1` to start both FastAPI backend and Next.js frontend.
3. Access UI at `http://localhost:3000`.

## Quick Start (Linux / macOS)
1. Run `./install_unix.sh`
2. Run `./start_unix.sh`

## Backend API — standalone setup

The backend can be installed and run without installing the frontend dependencies. Run these commands from the repository root.

### Windows (PowerShell)

```powershell
py -3.12 -m venv venv
.\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\venv\Scripts\python.exe -m pytest backend\tests tests
Set-Location backend
..\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

### Linux / macOS

```bash
python3 -m venv venv
./venv/bin/python -m pip install -r backend/requirements.txt
./venv/bin/python -m pytest backend/tests tests
cd backend
../venv/bin/python -m uvicorn main:app --reload --port 8000
```

The backend API is available at `http://localhost:8000`; interactive documentation is at `/docs`, ReDoc at `/redoc`, and the OpenAPI schema at `/openapi.json`. The default SQLite database is `database/nova.db`; set `DATABASE_URL` to use another database. To override settings locally, copy `backend/.env.example` to `backend/.env`.

The repository's `simulation/engine.py` is used by the live simulation adapter, so keep the `simulation` directory alongside `backend` for live runs. The backend has an explicitly labeled mock fallback if the live engine cannot be loaded.

### Submission readiness check (2026-11-12)

Verified with a new temporary Python 3.12.10 virtual environment: all packages in `backend/requirements.txt` installed successfully, `pip check` reported no broken requirements, and all 27 repository/backend tests passed. Uvicorn started from that environment; `/health`, `/docs`, `/redoc`, and `/openapi.json` returned HTTP 200. A live simulation completed successfully (`mock: false`). The check used a temporary SQLite database and did not create or modify `database/nova.db`.
