import sys
import os

import pytest

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'simulation'))
from engine import MissionSimulation


def make_valid_config():
    sc = {
        "base_mass": 200,
        "fuel_mass": 300,
        "solar_power_generation": 300,
        "base_power_consumption": 50,
        "cost": 50,
    }
    inst = [{"name": "Camera", "mass": 20, "cost": 10, "power_consumption": 20, "utility_score": 80}]
    launcher = {"name": "Nova-1", "payload_capacity": 1000, "cost": 40, "reliability": 0.95}
    orbit = {"altitude_km": 400, "inclination_deg": 28.5}
    return sc, inst, launcher, orbit


def test_simulation_success():
    sc, inst, launcher, orbit = make_valid_config()

    sim = MissionSimulation(sc, inst, launcher, orbit, 200.0)
    res = sim.run_full_simulation()

    assert res["mission_status"] == "SUCCESS"
    assert res["total_mass_kg"] == 520.0
    assert res["total_cost_m_usd"] == 100.0
    assert res["power_balance"]["is_viable"] == True


def test_result_is_structured_and_enriched():
    sc, inst, launcher, orbit = make_valid_config()
    res = MissionSimulation(sc, inst, launcher, orbit, 200.0).run_full_simulation()

    for key in (
        "risk_level",
        "risk_score",
        "checks",
        "warnings",
        "feasibility",
        "success_indicators",
        "communication",
        "mass",
        "budget",
    ):
        assert key in res

    assert res["feasibility"]["feasible"] is True
    assert {c["name"] for c in res["checks"]} == {"mass", "power", "budget", "communication"}
    assert res["risk_level"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    assert 0.0 <= res["score"] <= 100.0


def test_success_indicators_are_populated():
    sc, inst, launcher, orbit = make_valid_config()
    res = MissionSimulation(sc, inst, launcher, orbit, 200.0).run_full_simulation()

    indicators = res["success_indicators"]
    assert indicators["mass_margin_pct"] > 0
    assert indicators["power_margin_pct"] > 0
    assert indicators["budget_margin_pct"] > 0
    assert indicators["science_value"] == 80.0
    assert indicators["comms_viable"] is True


def test_overweight_configuration_fails_mass_check():
    sc, inst, launcher, orbit = make_valid_config()
    launcher["payload_capacity"] = 100.0

    res = MissionSimulation(sc, inst, launcher, orbit, 200.0).run_full_simulation()

    assert res["mission_status"] == "FAILED"
    mass_check = next(c for c in res["checks"] if c["name"] == "mass")
    assert mass_check["passed"] is False
    assert any("mass" in rec.lower() for rec in res["recommendations"])


def test_power_deficit_fails():
    sc, inst, launcher, orbit = make_valid_config()
    sc["solar_power_generation"] = 10.0

    res = MissionSimulation(sc, inst, launcher, orbit, 200.0).run_full_simulation()

    assert res["mission_status"] == "FAILED"
    assert res["power_balance"]["is_viable"] is False
    assert res["success_indicators"]["power_margin_pct"] < 0


def test_over_budget_configuration_fails():
    sc, inst, launcher, orbit = make_valid_config()

    res = MissionSimulation(sc, inst, launcher, orbit, 50.0).run_full_simulation()

    assert res["mission_status"] == "FAILED"
    budget_check = next(c for c in res["checks"] if c["name"] == "budget")
    assert budget_check["passed"] is False


def test_budget_reserve_pct_tightens_budget_check():
    sc, inst, launcher, orbit = make_valid_config()

    res = MissionSimulation(
        sc, inst, launcher, orbit, 110.0, resources={"budget_reserve_pct": 20.0}
    ).run_full_simulation()

    # cost is 100, usable budget = 110 * 0.8 = 88 -> over budget
    assert res["mission_status"] == "FAILED"
    assert res["budget"]["budget_reserve_pct"] == 20.0


def test_orbit_period_and_velocity():
    sc, inst, launcher, orbit = make_valid_config()
    res = MissionSimulation(sc, inst, launcher, orbit, 200.0).run_full_simulation()

    # Known two-body reference values at 400 km altitude
    assert res["orbit"]["orbital_period_minutes"] == pytest.approx(92.41, abs=0.1)
    assert res["orbit"]["orbital_velocity_kms"] == pytest.approx(7.669, abs=0.01)
    assert res["orbit"]["regime"] == "LEO"
    assert res["orbit"]["radiation_exposure_level"] == "Low"


def test_high_orbit_radiation_is_high():
    sc, inst, launcher, orbit = make_valid_config()
    orbit["altitude_km"] = 36000.0

    res = MissionSimulation(sc, inst, launcher, orbit, 200.0).run_full_simulation()

    assert res["orbit"]["regime"] == "GEO"
    assert res["orbit"]["radiation_exposure_level"] == "High"
    assert any("radiation" in w.lower() for w in res["warnings"])


def test_communication_undersized_link_warns():
    sc, inst, launcher, orbit = make_valid_config()
    communication = {"downlink_kbps": 1.0, "data_volume_mb": 5000.0}

    res = MissionSimulation(sc, inst, launcher, orbit, 200.0, communication=communication).run_full_simulation()

    assert res["communication"]["is_viable"] is False
    assert any("communication" in w.lower() for w in res["warnings"])
    # Comms is a warning-level constraint, not a critical failure
    assert res["mission_status"] == "SUCCESS"


def test_communication_defaults_are_viable_for_leo():
    sc, inst, launcher, orbit = make_valid_config()
    res = MissionSimulation(sc, inst, launcher, orbit, 200.0).run_full_simulation()

    assert res["communication"]["is_viable"] is True
    assert res["communication"]["estimated_downlink_kbps"] == 2000.0


def test_multiple_ground_stations_increase_capacity():
    sc, inst, launcher, orbit = make_valid_config()
    communication = {"ground_stations": 3}
    res = MissionSimulation(sc, inst, launcher, orbit, 200.0, communication=communication).run_full_simulation()

    assert res["communication"]["ground_stations"] == 3
    assert res["communication"]["contact_minutes_per_day"] == 120.0


def test_invalid_configuration_is_reported_not_raised():
    sc, inst, launcher, orbit = make_valid_config()
    sc["base_mass"] = -10

    res = MissionSimulation(sc, inst, launcher, orbit, 200.0).run_full_simulation()

    assert res["mission_status"] == "INVALID"
    assert res["feasibility"]["feasible"] is False
    assert res["feasibility"]["errors"]
    assert res["score"] == 0.0
    assert res["risk_level"] == "CRITICAL"


def test_empty_instruments_invalid():
    sc, _, launcher, orbit = make_valid_config()
    res = MissionSimulation(sc, [], launcher, orbit, 200.0).run_full_simulation()

    assert res["mission_status"] == "INVALID"
    assert any("instrument" in e.lower() for e in res["feasibility"]["errors"])


def test_non_numeric_budget_invalid():
    sc, inst, launcher, orbit = make_valid_config()
    res = MissionSimulation(sc, inst, launcher, orbit, "lots").run_full_simulation()

    assert res["mission_status"] == "INVALID"


def test_risk_level_escalates_with_bad_reliability():
    sc, inst, launcher, orbit = make_valid_config()
    launcher["reliability"] = 0.5
    orbit["altitude_km"] = 30000.0  # High radiation

    res = MissionSimulation(sc, inst, launcher, orbit, 200.0).run_full_simulation()

    assert res["risk_level"] in {"HIGH", "CRITICAL", "MEDIUM"}
    assert res["risk_score"] > 40.0


def test_legacy_public_methods_unchanged():
    sc, inst, launcher, orbit = make_valid_config()
    sim = MissionSimulation(sc, inst, launcher, orbit, 200.0)

    assert sim.calculate_total_mass() == 520.0
    assert sim.calculate_total_cost() == 100.0
    assert sim.calculate_power_balance()["is_viable"] is True
    assert sim.verify_launcher_compatibility()["compatible"] is True
    assert "orbital_period_minutes" in sim.simulate_orbit()
