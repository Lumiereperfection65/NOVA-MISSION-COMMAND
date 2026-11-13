# NOVA Mission Command — Backend API

Python FastAPI backend for mission management, persistence, validation, health monitoring, and simulation orchestration.

The API talks to the existing NOVA simulation engine in `../simulation/engine.py`. It does not implement frontend features.

## Architecture

```
backend/
├── app/
│   ├── main.py                 # FastAPI factory, CORS, routers, lifespan
│   ├── core/                   # Settings, logging, domain exceptions
│   ├── api/
│   │   ├── deps.py
│   │   ├── error_handlers.py
│   │   └── routes/             # health, missions, simulation, catalog
│   ├── models/                 # SQLAlchemy mission model
│   ├── schemas/                # Pydantic v2 request/response models
│   ├── services/               # Mission + simulation services and engine adapters
│   ├── repositories/           # Database access
│   └── database/               # Engine, sessions, schema init
├── tests/                      # Pytest + HTTPX, isolated SQLite
├── main.py                     # Uvicorn entrypoint: main:app
├── requirements.txt
└── .env.example
```

## Install

From the `NOVA-MISSION-COMMAND` project root:

```bash
python -m venv venv
```

Install the requirements using the new virtual environment:

```powershell
# Windows (PowerShell, from the project root)
.\venv\Scripts\python.exe -m pip install -r backend\requirements.txt

# Linux / macOS (from the project root)
./venv/bin/python -m pip install -r backend/requirements.txt
```

Copy `backend/.env.example` to `backend/.env` if you need local overrides.

The default database file is `database/nova.db` (same SQLite file initialized by the project installer). Mission records are stored in the `nova_missions` table so the installer-created legacy `missions(id, name)` table is not overwritten.

## Start

From `backend/`:

```bash
# Windows (PowerShell)
..\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000

# Linux / macOS
../venv/bin/python -m uvicorn main:app --reload --port 8000
```

Or from the project root:

```powershell
# Windows (PowerShell)
.\venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --reload --port 8000

# Linux / macOS
./venv/bin/python -m uvicorn main:app --app-dir backend --reload --port 8000
```

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI: http://localhost:8000/openapi.json

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | API name, version, health |
| GET | `/system/status` | Database + simulation engine status |
| GET | `/missions` | Paginated list (`page`, `page_size`, `status`) |
| POST | `/missions` | Create mission |
| GET | `/missions/{mission_id}` | Get mission |
| PUT | `/missions/{mission_id}` | Update mission |
| DELETE | `/missions/{mission_id}` | Delete mission |
| POST | `/missions/{mission_id}/simulate` | Run simulation for a persisted mission |
| POST | `/api/simulate` | Legacy direct simulation (frontend compatibility) |
| GET | `/api/catalog/launchers` | Launcher catalog |
| GET | `/api/catalog/instruments` | Instrument catalog |

## Postman collection

Import [`postman/NOVA-Mission-Command.postman_collection.json`](./postman/NOVA-Mission-Command.postman_collection.json) into Postman. The collection defaults to `http://127.0.0.1:8000`; change its `baseUrl` collection variable if needed. Start the API, then run the collection in order. The create request stores its mission ID for the subsequent get, update, simulate, and delete requests. The final request confirms a deleted mission returns 404. The collection also checks health, system status, OpenAPI, catalogs, input validation, and the legacy simulation endpoint.

## Simulation adapter

`SimulationService` uses `SimulationEngineAdapter`:

- **Live:** `NovaMissionSimulationAdapter` wraps `simulation.engine.MissionSimulation`.
- **Fallback:** `MockSimulationAdapter` is used only when the live engine cannot be imported or `SIMULATION_FORCE_MOCK=true`. Mock results always include `"mock": true` and are never labeled as live.

## Tests

From `backend/`:

```bash
pytest
```

Or from the project root:

```powershell
.\venv\Scripts\python.exe -m pytest backend\tests tests
```

Tests create a temporary SQLite file per run and do not modify `database/nova.db`. The live simulation adapter requires the repository's sibling `simulation/` directory; if it is unavailable, the service uses its clearly labeled mock adapter.
