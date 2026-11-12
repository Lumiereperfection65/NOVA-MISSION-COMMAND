"""Simulation execution and failure-handling tests."""

from types import SimpleNamespace

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import db_session, get_simulation_service
from app.core.exceptions import SimulationExecutionError
from app.database.connection import get_session_factory
from app.models.mission import Mission
from app.services.engines.base import SimulationEngineAdapter
from app.services.engines import factory as engine_factory
from app.services.engines.mock_engine import MockSimulationAdapter
from app.services.simulation_service import SimulationService
from tests.conftest import SAMPLE_MISSION


def _create_mission(client: TestClient, **overrides: object) -> dict:
    payload = {**SAMPLE_MISSION, **overrides}
    response = client.post("/missions", json=payload)
    assert response.status_code == 201
    return response.json()


def test_simulation_execution(client: TestClient) -> None:
    mission = _create_mission(client)
    response = client.post(f"/missions/{mission['id']}/simulate")
    assert response.status_code == 200
    body = response.json()
    assert body["mission_id"] == mission["id"]
    assert body["execution_status"] in {"completed", "failed"}
    assert "result" in body
    if body["engine_mode"] == "mock":
        assert body["mock"] is True
        assert body["result"].get("mock") is True
    else:
        assert body["mock"] is False
        assert body["engine_name"] == "NOVA MissionSimulation"


def test_mock_simulation_is_explicitly_labeled(app: FastAPI, client: TestClient) -> None:
    def override(session: Session = Depends(db_session)) -> SimulationService:
        return SimulationService(session, engine=MockSimulationAdapter())

    app.dependency_overrides[get_simulation_service] = override
    mission = _create_mission(client)
    response = client.post(f"/missions/{mission['id']}/simulate")
    assert response.status_code == 200
    payload = response.json()
    assert payload["engine_mode"] == "mock"
    assert payload["mock"] is True
    assert payload["result"]["mock"] is True
    assert "mock" in payload["result"]["mock_disclaimer"].lower()


def test_engine_factory_falls_back_when_live_engine_is_unavailable(
    monkeypatch,
) -> None:
    class UnavailableEngine:
        def is_available(self) -> bool:
            return False

    monkeypatch.setattr(
        engine_factory,
        "get_settings",
        lambda: SimpleNamespace(simulation_force_mock=False),
    )
    monkeypatch.setattr(engine_factory, "NovaMissionSimulationAdapter", UnavailableEngine)

    engine = engine_factory.get_simulation_engine()

    assert isinstance(engine, MockSimulationAdapter)
    assert engine.is_available() is True


def test_simulation_without_configuration(client: TestClient) -> None:
    mission = _create_mission(client, configuration=None)
    response = client.post(f"/missions/{mission['id']}/simulate")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_OPERATION"


def test_invalid_stored_configuration_does_not_expose_values(client: TestClient) -> None:
    mission = _create_mission(client)
    secret_value = "stored-sensitive-value"
    session = get_session_factory()()
    try:
        stored = session.get(Mission, mission["id"])
        assert stored is not None
        stored.configuration = {"budget_allocated": secret_value}
        session.commit()
    finally:
        session.close()

    response = client.post(f"/missions/{mission['id']}/simulate")
    assert response.status_code == 400
    assert secret_value not in response.text


def test_simulation_missing_mission(client: TestClient) -> None:
    response = client.post("/missions/00000000-0000-0000-0000-000000000000/simulate")
    assert response.status_code == 404


def test_simulation_failure_handling(app: FastAPI, client: TestClient) -> None:
    class FailingAdapter(SimulationEngineAdapter):
        @property
        def name(self) -> str:
            return "FailingAdapter"

        @property
        def is_mock(self) -> bool:
            return False

        def is_available(self) -> bool:
            return True

        def execute(self, configuration: dict) -> dict:
            raise SimulationExecutionError("Engine exploded during integration test.")

    def override(session: Session = Depends(db_session)) -> SimulationService:
        return SimulationService(session, engine=FailingAdapter())

    app.dependency_overrides[get_simulation_service] = override
    mission = _create_mission(client)
    response = client.post(f"/missions/{mission['id']}/simulate")
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "SIMULATION_EXECUTION_FAILED"
    persisted = client.get(f"/missions/{mission['id']}")
    assert persisted.json()["status"] == "failed"


def test_simulation_engine_unavailable(app: FastAPI, client: TestClient) -> None:
    class UnavailableAdapter(SimulationEngineAdapter):
        @property
        def name(self) -> str:
            return "UnavailableAdapter"

        @property
        def is_mock(self) -> bool:
            return False

        def is_available(self) -> bool:
            return False

        def execute(self, configuration: dict) -> dict:
            raise AssertionError("execute must not be called")

    def override(session: Session = Depends(db_session)) -> SimulationService:
        return SimulationService(session, engine=UnavailableAdapter())

    app.dependency_overrides[get_simulation_service] = override
    mission = _create_mission(client)
    response = client.post(f"/missions/{mission['id']}/simulate")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "SIMULATION_ENGINE_UNAVAILABLE"


def test_legacy_simulate_endpoint(client: TestClient) -> None:
    payload = {
        "name": "Lunar Explorer Alpha",
        "destination": "Moon",
        "duration_days": 30,
        "difficulty": "Intermediate",
        "budget_allocated": 200.0,
        "spacecraft": SAMPLE_MISSION["configuration"]["spacecraft"],
        "instruments": SAMPLE_MISSION["configuration"]["instruments"],
        "launcher": SAMPLE_MISSION["configuration"]["launcher"],
        "orbit": SAMPLE_MISSION["configuration"]["orbit"],
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert "mission_status" in body
    if body.get("engine_mode") == "mock":
        assert body["mock"] is True
    else:
        assert body["mock"] is False
