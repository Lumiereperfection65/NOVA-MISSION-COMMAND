# API reference

Base URL for local development: `http://localhost:8000`. FastAPI provides generated reference pages at `/docs`, `/redoc`, and `/openapi.json`.

The examples use `curl`; on Windows PowerShell, invoke `curl.exe` to avoid the legacy `curl` alias.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Service banner |
| `GET` | `/health` | API name, version, environment, and health |
| `GET` | `/system/status` | Database connectivity and simulation adapter mode |
| `GET` | `/api/catalog/launchers` | Illustrative launcher catalog |
| `GET` | `/api/catalog/instruments` | Illustrative instrument catalog |
| `GET` | `/missions?page=1&page_size=20&status=draft` | Paginated missions; optional status filter |
| `POST` | `/missions` | Create and persist a mission |
| `GET` | `/missions/{mission_id}` | Retrieve a mission |
| `PUT` | `/missions/{mission_id}` | Update supplied fields on a mission |
| `DELETE` | `/missions/{mission_id}` | Delete a mission; returns `204` |
| `POST` | `/missions/{mission_id}/simulate` | Run and store the result for a persisted mission |
| `POST` | `/api/simulate` | Run a direct, non-persisted simulation (current Builder contract) |

`page` starts at 1; `page_size` is 1–100 and defaults to 20. Mission statuses are `draft`, `planned`, `ready`, `simulating`, `completed`, `failed`, and `cancelled`. Mission types are `exploration`, `science`, `communication`, `earth_observation`, `crewed`, `cargo`, and `technology_demo`.

## Health and catalogs

```bash
curl http://localhost:8000/health
curl http://localhost:8000/system/status
curl http://localhost:8000/api/catalog/launchers
curl http://localhost:8000/api/catalog/instruments
```

Catalog records are hard-coded demonstration data. They should not be treated as verified launcher specifications, flight-qualified instruments, or real prices.

## Direct simulation

`POST /api/simulate` validates the request and runs an engine without creating a mission record. Required top-level fields are `name`, `destination`, `duration_days`, `difficulty`, `budget_allocated`, `spacecraft`, `instruments`, `launcher`, and `orbit`.

```bash
curl -X POST http://localhost:8000/api/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lunar Explorer Alpha",
    "destination": "Moon",
    "duration_days": 30,
    "difficulty": "Intermediate",
    "budget_allocated": 200,
    "spacecraft": {
      "base_mass": 200,
      "fuel_mass": 400,
      "solar_power_generation": 300,
      "base_power_consumption": 60,
      "cost": 50
    },
    "instruments": [
      {
        "name": "High-Res Optical Camera",
        "mass": 15,
        "cost": 12,
        "power_consumption": 20,
        "utility_score": 85
      },
      {
        "name": "Infrared Spectrometer",
        "mass": 25,
        "cost": 22,
        "power_consumption": 35,
        "utility_score": 90
      }
    ],
    "launcher": {
      "name": "Nova-1 Light",
      "payload_capacity": 1000,
      "cost": 50
    },
    "orbit": {
      "altitude_km": 100,
      "inclination_deg": 45
    }
  }'
```

The response is the engine result plus adapter metadata. For this request, the live adapter currently returns a successful illustrative result with 640 kg total mass, 134 M USD total cost, +185 W power balance, 86.34-minute orbit period, and a 97.5 score. The result is not persisted.

`mission_status` may be `SUCCESS`, `FAILED`, or `INVALID`. A structurally invalid request is returned as HTTP `422`. A structurally valid but infeasible engine configuration may return HTTP `200` with `mission_status: "INVALID"` or `"FAILED"`. Check `mock` and `engine_mode` before interpreting the result.

## Persisted mission lifecycle

Create a mission with a complete simulation configuration:

```bash
curl -X POST http://localhost:8000/missions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lunar Explorer Alpha",
    "description": "Illustrative lunar mapping study.",
    "mission_type": "exploration",
    "destination": "Moon",
    "duration": 30,
    "status": "planned",
    "configuration": {
      "budget_allocated": 200,
      "difficulty": "Intermediate",
      "spacecraft": {
        "base_mass": 200,
        "fuel_mass": 400,
        "solar_power_generation": 300,
        "base_power_consumption": 60,
        "cost": 50
      },
      "instruments": [
        {
          "name": "High-Res Optical Camera",
          "mass": 15,
          "cost": 12,
          "power_consumption": 20,
          "utility_score": 85
        }
      ],
      "launcher": {
        "name": "Nova-1 Light",
        "payload_capacity": 1000,
        "cost": 50,
        "reliability": 0.95
      },
      "orbit": {
        "altitude_km": 100,
        "inclination_deg": 45
      }
    }
  }'
```

The create response includes a generated `id`. Use it in subsequent requests:

```bash
curl "http://localhost:8000/missions?page=1&page_size=20&status=planned"
curl http://localhost:8000/missions/<MISSION_ID>
curl -X PUT http://localhost:8000/missions/<MISSION_ID> \
  -H "Content-Type: application/json" \
  -d '{"status":"ready"}'
curl -X POST http://localhost:8000/missions/<MISSION_ID>/simulate
curl -X DELETE http://localhost:8000/missions/<MISSION_ID>
```

The stored-mission simulation response includes `mission_id`, `execution_status`, `engine_mode`, `engine_name`, `mock`, `mission_status`, `score`, and the detailed `result`. The service stores the result in `last_simulation` and updates mission status to `completed` for a `SUCCESS` engine result, otherwise `failed`.

The typed `MissionConfiguration` allows extra fields. The simulation engine supports optional `communication` and `resources` blocks when they are present in a persisted mission configuration. These are not first-class typed fields or Builder controls. The legacy `/api/simulate` schema accepts extra input keys but its conversion currently drops these optional blocks.

## Errors

Application errors use this envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": []
  }
}
```

Common statuses include `400` for invalid operations, `404` for missing missions, `422` for request validation, `500` for execution/database failures, and `503` when the selected simulation engine is unavailable. Validation `details` identify the field location. Mission-not-found errors use code `MISSION_NOT_FOUND`.
