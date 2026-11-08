import sys
import os
import pytest

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'simulation'))
from engine import MissionSimulation

def test_simulation_success():
    sc = {"base_mass": 200, "fuel_mass": 300, "solar_power_generation": 300, "base_power_consumption": 50, "cost": 50}
    inst = [{"name": "Camera", "mass": 20, "cost": 10, "power_consumption": 20, "utility_score": 80}]
    launcher = {"name": "Nova-1", "payload_capacity": 1000, "cost": 40}
    orbit = {"altitude_km": 400, "inclination_deg": 28.5}
    
    sim = MissionSimulation(sc, inst, launcher, orbit, 200.0)
    res = sim.run_full_simulation()
    
    assert res["mission_status"] == "SUCCESS"
    assert res["total_mass_kg"] == 520.0
    assert res["total_cost_m_usd"] == 100.0
    assert res["power_balance"]["is_viable"] == True
