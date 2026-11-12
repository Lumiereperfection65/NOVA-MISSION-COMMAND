"""Health, system status, and database connectivity tests."""

from unittest.mock import Mock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.api.routes.health import _check_database
from app.core.config import Settings, get_settings


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "healthy"
    assert payload["name"]
    assert payload["version"]


def test_root_banner(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["project"] == "NOVA MISSION COMMAND"


def test_system_status_and_database_connectivity(client: TestClient) -> None:
    response = client.get("/system/status")
    assert response.status_code == 200
    payload = response.json()
    assert payload["database"]["available"] is True
    assert payload["database"]["latency_ms"] is not None
    assert payload["simulation_engine"]["available"] is True
    assert payload["simulation_engine"]["mode"] in {"live", "mock"}
    assert payload["status"] in {"operational", "degraded"}
    if payload["simulation_engine"]["mode"] == "live":
        assert payload["simulation_engine"]["mock"] is False
    else:
        assert payload["simulation_engine"]["mock"] is True


def test_database_health_failure_rolls_back_session() -> None:
    session = Mock()
    session.execute.side_effect = OperationalError("SELECT 1", {}, Exception("database unavailable"))

    status = _check_database(session)

    assert status.available is False
    assert status.detail == "unreachable"
    session.rollback.assert_called_once()


def test_cors_rejects_wildcard_origins_with_credentials() -> None:
    with pytest.raises(ValueError, match="wildcard origins cannot be combined with credentials"):
        Settings(cors_origins="*", cors_allow_credentials=True)

    non_credentialed = Settings(cors_origins="*", cors_allow_credentials=False)
    assert non_credentialed.cors_origin_list == ["*"]


def test_database_error_details_are_hidden_in_production(
    app: FastAPI,
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def raise_database_error() -> None:
        raise SQLAlchemyError("private database connection detail")

    app.add_api_route("/test/database-error", raise_database_error, methods=["GET"])
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("DEBUG", "true")
    get_settings.cache_clear()

    response = client.get("/test/database-error")

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "DATABASE_ERROR"
    assert "private database connection detail" not in response.text


def test_openapi_and_docs_are_available(client: TestClient) -> None:
    openapi = client.get("/openapi.json")
    docs = client.get("/docs")
    redoc = client.get("/redoc")
    assert openapi.status_code == 200
    assert "paths" in openapi.json()
    assert docs.status_code == 200
    assert redoc.status_code == 200
