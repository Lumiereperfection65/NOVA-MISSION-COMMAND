"""Isolated SQLite test fixtures. Tests never touch development or production data."""

from __future__ import annotations

import sys
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

SAMPLE_CONFIGURATION = {
    "budget_allocated": 200.0,
    "difficulty": "Intermediate",
    "spacecraft": {
        "base_mass": 200.0,
        "fuel_mass": 400.0,
        "solar_power_generation": 300.0,
        "base_power_consumption": 60.0,
        "cost": 50.0,
    },
    "instruments": [
        {
            "name": "High-Res Optical Camera",
            "mass": 15.0,
            "cost": 12.0,
            "power_consumption": 20.0,
            "utility_score": 85.0,
        }
    ],
    "launcher": {
        "name": "Nova-1 Light",
        "payload_capacity": 1000.0,
        "cost": 50.0,
        "reliability": 0.95,
    },
    "orbit": {"altitude_km": 100.0, "inclination_deg": 45.0},
}

SAMPLE_MISSION = {
    "name": "Lunar Explorer Alpha",
    "description": "High-resolution lunar mapping mission.",
    "mission_type": "exploration",
    "destination": "Moon",
    "launch_date": "2027-06-12",
    "duration": 30,
    "status": "planned",
    "configuration": SAMPLE_CONFIGURATION,
}


@pytest.fixture
def app(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Generator[FastAPI, None, None]:
    database_path = tmp_path / "nova-test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{database_path.as_posix()}")
    monkeypatch.setenv("ENVIRONMENT", "test")
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000")

    from app.core.config import get_settings
    from app.database.connection import reset_engine

    get_settings.cache_clear()
    reset_engine()

    from app.database.initialization import init_database
    from app.main import create_app

    application = create_app()
    init_database()
    yield application

    application.dependency_overrides.clear()
    reset_engine()
    get_settings.cache_clear()


@pytest.fixture
def client(app: FastAPI) -> Generator[TestClient, None, None]:
    with TestClient(app) as http_client:
        yield http_client
