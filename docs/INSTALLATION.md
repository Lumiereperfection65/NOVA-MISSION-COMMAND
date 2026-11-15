# Installation and local development

## Prerequisites

- Python 3.10–3.12. Python 3.12 is the recommended version for the pinned NumPy 1.26.4 dependency.
- Node.js 18.17 or later and npm for the Next.js 14 frontend.
- Git to clone the repository.

The frontend test command has a newer runtime requirement than the application: Node.js 22.18+ or 23.6+ is needed for the built-in Node test runner's TypeScript support.

Run all commands from the repository root unless a step says otherwise.

## Windows

Confirm that the `python` command on `PATH` is Python 3.10–3.12 and that `node` and `npm` are available. The installation script creates its virtual environment using `python`, so it uses whichever Python is first on `PATH`.

If the current PowerShell execution policy prevents running the repository script, allow scripts for this process only:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then run:

```powershell
.\install_windows.ps1
.\start_windows.ps1
```

The installer installs the Python requirements and runs `npm install` in `frontend`. It also creates a legacy SQLite `missions` table. The API initializes its own `nova_missions` table when it starts; the installer does not seed real or simulated mission records.

### Manual Windows setup

Use the Python launcher to choose a specific Python version:

```powershell
py -3.12 -m venv venv
.\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Push-Location frontend
npm.cmd install
Pop-Location
```

Start the backend and frontend in separate PowerShell windows:

```powershell
# Window 1, from the repository root
Set-Location backend
..\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

```powershell
# Window 2, from the repository root
Set-Location frontend
npm.cmd run dev
```

If you prefer the provided start script, it opens two PowerShell windows and starts both development servers.

## Linux and macOS

Make sure `python3 --version` selects Python 3.10–3.12 and that Node.js/npm are installed. Run the provided scripts with Bash; executable file mode is not required:

```bash
bash install_unix.sh
bash start_unix.sh
```

### Manual Linux/macOS setup

```bash
python3.12 -m venv venv
./venv/bin/python -m pip install -r backend/requirements.txt
(cd frontend && npm install)
```

Start the services in separate terminals:

```bash
# Terminal 1, from the repository root
cd backend
../venv/bin/python -m uvicorn main:app --reload --port 8000
```

```bash
# Terminal 2, from the repository root
cd frontend
npm run dev
```

The combined `start_unix.sh` script starts Uvicorn and Next.js as background jobs and waits for them.

## Standalone backend

The frontend is not required to use the API. From the repository root:

```powershell
# Windows
py -3.12 -m venv venv
.\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\venv\Scripts\python.exe -m pytest backend\tests tests
Set-Location backend
..\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

```bash
# Linux/macOS
python3.12 -m venv venv
./venv/bin/python -m pip install -r backend/requirements.txt
./venv/bin/python -m pytest backend/tests tests
cd backend
../venv/bin/python -m uvicorn main:app --reload --port 8000
```

## Local configuration

Copy `backend/.env.example` to `backend/.env` to override backend settings. Relevant variables include:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | SQLite at `database/nova.db` | SQLAlchemy database URL |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:8000` | Comma-separated allowed origins |
| `SIMULATION_FORCE_MOCK` | `false` | Force the explicitly labeled mock adapter |
| `ENVIRONMENT` | `development` | Application environment name |

To change the browser's API origin, create `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Restart the frontend after changing this value.

## Verify the services

- Frontend: <http://localhost:3000>
- API banner: <http://localhost:8000/>
- Health: <http://localhost:8000/health>
- Operational status: <http://localhost:8000/system/status>
- Swagger UI: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>
- OpenAPI JSON: <http://localhost:8000/openapi.json>

Check `/system/status` to see whether the simulation adapter is `live` or `mock`. A healthy API response by itself does not prove that the engine is live.

## Tests

From the repository root:

```powershell
# Windows
.\venv\Scripts\python.exe -m pytest backend\tests tests
node --test frontend\src\lib\mission\errors.test.mjs
```

```bash
# Linux/macOS
./venv/bin/python -m pytest backend/tests tests
node --test frontend/src/lib/mission/errors.test.mjs
```

The Python tests use temporary SQLite databases. The frontend test file is run directly with Node; `frontend/package.json` does not define an `npm test` script.
