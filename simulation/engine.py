"""
NOVA MISSION COMMAND - Simulation Engine
NASA Space Apps Challenge 2026
Team: Nova Tech Africa
"""

import numpy as np

class MissionSimulation:
    def __init__(self, spacecraft: dict, instruments: list, launcher: dict, orbit: dict, budget_allocated: float):
        self.spacecraft = spacecraft
        self.instruments = instruments
        self.launcher = launcher
        self.orbit = orbit
        self.budget_allocated = budget_allocated

    def calculate_total_mass(self) -> float:
        base_mass = self.spacecraft.get("base_mass", 150.0)
        inst_mass = sum(i.get("mass", 20.0) for i in self.instruments)
        fuel_mass = self.spacecraft.get("fuel_mass", 300.0)
        return float(base_mass + inst_mass + fuel_mass)

    def calculate_total_cost(self) -> float:
        sc_cost = self.spacecraft.get("cost", 50.0)
        inst_cost = sum(i.get("cost", 15.0) for i in self.instruments)
        launcher_cost = self.launcher.get("cost", 80.0)
        return float(sc_cost + inst_cost + launcher_cost)

    def calculate_power_balance(self) -> dict:
        generation = self.spacecraft.get("solar_power_generation", 250.0)
        consumption = self.spacecraft.get("base_power_consumption", 50.0) + sum(i.get("power_consumption", 25.0) for i in self.instruments)
        balance = generation - consumption
        return {
            "generation": generation,
            "consumption": consumption,
            "balance": balance,
            "is_viable": balance >= 0
        }

    def verify_launcher_compatibility(self) -> dict:
        total_mass = self.calculate_total_mass()
        payload_capacity = self.launcher.get("payload_capacity", 1000.0)
        compatible = total_mass <= payload_capacity
        return {
            "total_mass_kg": total_mass,
            "payload_capacity_kg": payload_capacity,
            "compatible": compatible,
            "margin_kg": payload_capacity - total_mass
        }

    def simulate_orbit(self) -> dict:
        altitude_km = self.orbit.get("altitude_km", 400.0)
        inclination_deg = self.orbit.get("inclination_deg", 28.5)
        # Keplerian orbital period approximation around Earth (radius 6371 km)
        mu = 398600.4418 # km^3/s^2
        r = 6371.0 + altitude_km
        period_seconds = 2.0 * np.pi * np.sqrt(r**3 / mu)
        period_minutes = period_seconds / 60.0
        orbital_velocity = np.sqrt(mu / r) # km/s

        return {
            "altitude_km": altitude_km,
            "inclination_deg": inclination_deg,
            "orbital_period_minutes": round(period_minutes, 2),
            "orbital_velocity_kms": round(orbital_velocity, 3),
            "radiation_exposure_level": "Low" if altitude_km < 1000 else "Moderate"
        }

    def run_full_simulation(self) -> dict:
        mass_check = self.verify_launcher_compatibility()
        power_check = self.calculate_power_balance()
        total_cost = self.calculate_total_cost()
        budget_ok = total_cost <= self.budget_allocated
        orbit_data = self.simulate_orbit()

        success = mass_check["compatible"] and power_check["is_viable"] and budget_ok
        
        score = 0.0
        if success:
            score += 50.0
            score += min(50.0, len(self.instruments) * 10.0)
            if power_check["balance"] > 50:
                score += 15.0
        else:
            score = 25.0

        return {
            "mission_status": "SUCCESS" if success else "FAILED",
            "score": round(score, 1),
            "total_mass_kg": mass_check["total_mass_kg"],
            "payload_capacity_kg": mass_check["payload_capacity_kg"],
            "total_cost_m_usd": total_cost,
            "budget_allocated_m_usd": self.budget_allocated,
            "power_balance": power_check,
            "orbit": orbit_data,
            "recommendations": [] if success else ["Reduce spacecraft payload mass", "Optimize scientific instrument power consumption", "Select a heavier launcher or increase budget."]
        }
