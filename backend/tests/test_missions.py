"""Mission CRUD, validation, and missing-resource tests."""

from fastapi.testclient import TestClient

from app.database.connection import get_engine
from tests.conftest import SAMPLE_MISSION


def test_create_mission(client: TestClient) -> None:
    response = client.post("/missions", json=SAMPLE_MISSION)
    assert response.status_code == 201
    payload = response.json()
    assert payload["id"]
    assert payload["name"] == SAMPLE_MISSION["name"]
    assert payload["status"] == "planned"
    assert payload["created_at"]
    assert payload["updated_at"]


def test_list_missions_with_pagination_and_status_filter(client: TestClient) -> None:
    client.post("/missions", json=SAMPLE_MISSION)
    draft = {**SAMPLE_MISSION, "name": "Draft Probe", "status": "draft"}
    client.post("/missions", json=draft)

    listed = client.get("/missions", params={"page": 1, "page_size": 10})
    assert listed.status_code == 200
    body = listed.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2

    filtered = client.get("/missions", params={"status": "draft"})
    assert filtered.status_code == 200
    assert filtered.json()["total"] == 1
    assert filtered.json()["items"][0]["status"] == "draft"


def test_get_mission(client: TestClient) -> None:
    created = client.post("/missions", json=SAMPLE_MISSION).json()
    response = client.get(f"/missions/{created['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_update_mission(client: TestClient) -> None:
    created = client.post("/missions", json=SAMPLE_MISSION).json()
    response = client.put(
        f"/missions/{created['id']}",
        json={"name": "Lunar Explorer Beta", "status": "ready"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["name"] == "Lunar Explorer Beta"
    assert payload["status"] == "ready"
    assert payload["destination"] == "Moon"


def test_delete_mission(client: TestClient) -> None:
    created = client.post("/missions", json=SAMPLE_MISSION).json()
    deleted = client.delete(f"/missions/{created['id']}")
    assert deleted.status_code == 204
    missing = client.get(f"/missions/{created['id']}")
    assert missing.status_code == 404


def test_missing_mission_errors(client: TestClient) -> None:
    unknown = "00000000-0000-0000-0000-000000000000"
    assert client.get(f"/missions/{unknown}").status_code == 404
    assert client.put(f"/missions/{unknown}", json={"name": "Nope"}).status_code == 404
    assert client.delete(f"/missions/{unknown}").status_code == 404
    payload = client.get(f"/missions/{unknown}").json()
    assert payload["error"]["code"] == "MISSION_NOT_FOUND"


def test_invalid_input_validation(client: TestClient) -> None:
    invalid = {**SAMPLE_MISSION, "name": "", "duration": 0}
    response = client.post("/missions", json=invalid)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "name" in response.json()["error"]["details"][0]["location"]

    empty_update = client.post("/missions", json=SAMPLE_MISSION)
    mission_id = empty_update.json()["id"]
    update = client.put(f"/missions/{mission_id}", json={})
    assert update.status_code == 422


def test_update_rejects_blank_or_null_required_fields(client: TestClient) -> None:
    created = client.post("/missions", json=SAMPLE_MISSION).json()
    invalid_updates = [
        {"name": "   "},
        {"destination": "   "},
        {"mission_type": None},
        {"duration": None},
        {"status": None},
    ]

    for payload in invalid_updates:
        response = client.put(f"/missions/{created['id']}", json=payload)
        assert response.status_code == 422

    unchanged = client.get(f"/missions/{created['id']}").json()
    assert unchanged["name"] == SAMPLE_MISSION["name"]
    assert unchanged["destination"] == SAMPLE_MISSION["destination"]


def test_validation_error_does_not_echo_submitted_values(client: TestClient) -> None:
    secret_value = "do-not-return-this-value"
    invalid = {**SAMPLE_MISSION, "duration": secret_value}
    response = client.post("/missions", json=invalid)
    assert response.status_code == 422
    assert secret_value not in response.text


def test_database_operation_failure_returns_safe_error(client: TestClient) -> None:
    with get_engine().begin() as connection:
        connection.exec_driver_sql("DROP TABLE nova_missions")

    response = client.get("/missions")

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "DATABASE_ERROR"
    assert "sqlite" not in response.text.lower()
