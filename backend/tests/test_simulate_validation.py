"""Regression tests for anomaly B1 on ``POST /api/simulate``.

An invalid ``spacecraft``, ``launcher`` or ``orbit`` block (or an empty
``instruments`` list) must be rejected as a client error:

* HTTP 422, never HTTP 500;
* body shaped as ``{"error": {"code", "message", "details"}}``;
* ``details`` pointing at the offending field.
"""

from __future__ import annotations

import copy
import json
from collections.abc import Generator
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

VALID_PAYLOAD: dict[str, Any] = {
    "name": "Lunar Explorer Alpha",
    "destination": "Moon",
    "duration_days": 30,
    "difficulty": "Intermediate",
    "budget_allocated": 200.0,
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
    "orbit": {"altitude_km": 400.0, "inclination_deg": 45.0},
}

_REMOVE = object()


def _payload(path: tuple[str, ...], value: Any = _REMOVE) -> dict[str, Any]:
    """Return the valid payload with one field replaced, or removed by default."""
    payload = copy.deepcopy(VALID_PAYLOAD)
    node = payload
    for key in path[:-1]:
        node = node[key]
    if value is _REMOVE:
        del node[path[-1]]
    else:
        node[path[-1]] = value
    return payload


# (case id, payload, location that ``details`` must point at, below "body")
INVALID_CASES: list[tuple[str, dict[str, Any], tuple[str, ...]]] = [
    ("spacecraft.base_mass='abc'", _payload(("spacecraft", "base_mass"), "abc"), ("spacecraft", "base_mass")),
    ("launcher.cost='abc'", _payload(("launcher", "cost"), "abc"), ("launcher", "cost")),
    ("orbit.altitude_km='abc'", _payload(("orbit", "altitude_km"), "abc"), ("orbit", "altitude_km")),
    ("spacecraft.base_mass=-10", _payload(("spacecraft", "base_mass"), -10), ("spacecraft", "base_mass")),
    ("spacecraft.fuel_mass=-1", _payload(("spacecraft", "fuel_mass"), -1), ("spacecraft", "fuel_mass")),
    ("orbit.altitude_km=-5", _payload(("orbit", "altitude_km"), -5), ("orbit", "altitude_km")),
    ("spacecraft={}", _payload(("spacecraft",), {}), ("spacecraft",)),
    ("launcher={}", _payload(("launcher",), {}), ("launcher",)),
    ("orbit={}", _payload(("orbit",), {}), ("orbit",)),
    ("spacecraft.base_mass missing", _payload(("spacecraft", "base_mass")), ("spacecraft", "base_mass")),
    (
        "launcher.payload_capacity missing",
        _payload(("launcher", "payload_capacity")),
        ("launcher", "payload_capacity"),
    ),
    ("orbit.altitude_km missing", _payload(("orbit", "altitude_km")), ("orbit", "altitude_km")),
    ("instruments=[]", _payload(("instruments",), []), ("instruments",)),
    (
        "launcher.payload_capacity=0",
        _payload(("launcher", "payload_capacity"), 0),
        ("launcher", "payload_capacity"),
    ),
    ("launcher.reliability=1.5", _payload(("launcher", "reliability"), 1.5), ("launcher", "reliability")),
    ("orbit.inclination_deg=200", _payload(("orbit", "inclination_deg"), 200), ("orbit", "inclination_deg")),
    ("spacecraft.cost=NaN", _payload(("spacecraft", "cost"), float("nan")), ("spacecraft", "cost")),
]


@pytest.fixture
def api_client(app: FastAPI) -> Generator[TestClient, None, None]:
    """Client that returns HTTP 500 responses instead of re-raising server errors.

    The shared ``client`` fixture re-raises unhandled server exceptions, which
    would hide the status code and error body these tests assert on.
    """
    with TestClient(app, raise_server_exceptions=False) as http_client:
        yield http_client


def _post(client: TestClient, payload: dict[str, Any]):
    # Serialized by hand so a NaN value reaches the API as the JSON literal ``NaN``.
    return client.post(
        "/api/simulate",
        content=json.dumps(payload),
        headers={"Content-Type": "application/json"},
    )


def test_valid_configuration_returns_200(api_client: TestClient) -> None:
    response = _post(api_client, VALID_PAYLOAD)

    assert response.status_code == 200
    body = response.json()
    assert body["mission_status"] in {"SUCCESS", "FAILED"}
    assert "error" not in body


@pytest.mark.parametrize(
    ("payload", "expected_location"),
    [pytest.param(payload, location, id=case_id) for case_id, payload, location in INVALID_CASES],
)
def test_invalid_configuration_returns_422(
    api_client: TestClient,
    payload: dict[str, Any],
    expected_location: tuple[str, ...],
) -> None:
    response = _post(api_client, payload)

    assert response.status_code == 422, (
        f"expected a 422 validation error, got {response.status_code}: {response.text}"
    )

    body = response.json()
    assert set(body) == {"error"}
    error = body["error"]
    assert set(error) == {"code", "message", "details"}
    assert error["code"] == "VALIDATION_ERROR"
    assert isinstance(error["message"], str) and error["message"]

    details = error["details"]
    assert isinstance(details, list) and details
    expected_prefix = ["body", *expected_location]
    locations = [list(item.get("location", [])) for item in details]
    assert any(location[: len(expected_prefix)] == expected_prefix for location in locations), (
        f"details do not point at {'.'.join(expected_location)}: {locations}"
    )
