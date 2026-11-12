"""
NOVA MISSION COMMAND - Simulation Engine
NASA Space Apps Challenge 2026
Team: Nova Tech Africa

Facade module: delegates to the modular simulation package while preserving
the historical ``engine.MissionSimulation`` import path used by the backend
adapter.
"""

from typing import Any

try:
    from simulation import budget, comms, mass, orbit, power, risk, validation
except ImportError:  # imported as a top-level module with simulation/ on sys.path
    import budget, comms, mass, orbit, power, risk, validation


class MissionSimulation:
    """Evaluate space mission configurations end to end."""

    def __init__(
        self,
        spacecraft: dict,
        instruments: list,
        launcher: dict,
        orbit: dict,
        budget_allocated: float,
        communication: dict | None = None,
        resources: dict | None = None,
    ):
        self.spacecraft = spacecraft if isinstance(spacecraft, dict) else {}
        self.instruments = instruments if isinstance(instruments, list) else []
        self.launcher = launcher if isinstance(launcher, dict) else {}
        self.orbit = orbit if isinstance(orbit, dict) else {}
        self.budget_allocated = budget_allocated
        self.communication = communication if isinstance(communication, dict) else {}
        self.resources = resources if isinstance(resources, dict) else {}

    # ------------------------------------------------------------------
    # Legacy public API (kept backward compatible)
    # ------------------------------------------------------------------
    def calculate_total_mass(self) -> float:
        return mass.calculate_total_mass(self.spacecraft, self.instruments)

    def calculate_total_cost(self) -> float:
        return budget.calculate_total_cost(self.spacecraft, self.instruments, self.launcher)

    def calculate_power_balance(self) -> dict:
        return power.calculate_power_balance(self.spacecraft, self.instruments)

    def verify_launcher_compatibility(self) -> dict:
        result = mass.evaluate(self.spacecraft, self.instruments, self.launcher)
        return {
            "total_mass_kg": result["total_mass_kg"],
            "payload_capacity_kg": result["payload_capacity_kg"],
            "compatible": result["compatible"],
            "margin_kg": result["margin_kg"],
        }

    def simulate_orbit(self) -> dict:
        return orbit.simulate_orbit(self.orbit)

    # ------------------------------------------------------------------
    # Full simulation
    # ------------------------------------------------------------------
    def run_full_simulation(self) -> dict[str, Any]:
        validation_result = validation.validate_configuration(
            self.spacecraft,
            self.instruments,
            self.launcher,
            self.orbit,
            self.budget_allocated,
        )
        warnings: list[str] = list(validation_result["warnings"])

        if not validation_result["feasible"]:
            return self._invalid_result(validation_result)

        reserve_pct = self._budget_reserve_pct()
        mass_eval = mass.evaluate(self.spacecraft, self.instruments, self.launcher)
        power_eval = power.calculate_power_balance(self.spacecraft, self.instruments)
        budget_eval = budget.evaluate(
            self.spacecraft,
            self.instruments,
            self.launcher,
            self.budget_allocated,
            reserve_pct=reserve_pct,
        )
        orbit_data = orbit.simulate_orbit(self.orbit)
        comms_eval = comms.evaluate(self.orbit, self.instruments, self.communication)

        launcher_reliability = self._launcher_reliability()
        risk_eval = risk.evaluate(
            mass_eval["margin_pct"],
            power_eval["balance_pct"],
            budget_eval["margin_pct"],
            launcher_reliability,
            orbit_data["radiation_exposure_level"],
            comms_eval["is_viable"],
        )

        checks = [
            mass_eval["check"],
            power_eval["check"],
            budget_eval["check"],
            comms_eval["check"],
        ]

        if mass_eval["margin_pct"] < 10.0:
            warnings.append("Mass margin below 10% of payload capacity.")
        if power_eval["balance_pct"] < 10.0:
            warnings.append("Power margin below 10% of generation capacity.")
        if budget_eval["margin_pct"] < 10.0:
            warnings.append("Budget margin below 10% of usable budget.")
        if not comms_eval["is_viable"]:
            warnings.append("Communication capacity cannot downlink the required data volume per day.")
        if orbit_data["radiation_exposure_level"] != "Low":
            warnings.append(f"Radiation exposure is {orbit_data['radiation_exposure_level']} for this orbit.")

        success = (
            mass_eval["compatible"]
            and power_eval["is_viable"]
            and budget_eval["within_budget"]
        )

        science_value = self._science_value()
        score = self._score(success, science_value, mass_eval, power_eval)
        recommendations = self._recommendations(mass_eval, power_eval, budget_eval, comms_eval, warnings)

        result = {
            "mission_status": "SUCCESS" if success else "FAILED",
            "score": round(score, 1),
            "total_mass_kg": mass_eval["total_mass_kg"],
            "payload_capacity_kg": mass_eval["payload_capacity_kg"],
            "total_cost_m_usd": budget_eval["total_cost_m_usd"],
            "budget_allocated_m_usd": budget_eval["budget_allocated_m_usd"],
            "power_balance": power_eval,
            "orbit": orbit_data,
            "recommendations": recommendations,
            # Enriched, structured output
            "risk_level": risk_eval["risk_level"],
            "risk_score": risk_eval["risk_score"],
            "checks": checks,
            "warnings": warnings,
            "feasibility": {
                "feasible": True,
                "errors": [],
                "warnings": list(validation_result["warnings"]),
            },
            "communication": comms_eval,
            "mass": mass_eval,
            "budget": budget_eval,
            "success_indicators": {
                "mass_margin_pct": round(mass_eval["margin_pct"], 2),
                "power_margin_pct": round(power_eval["balance_pct"], 2),
                "budget_margin_pct": round(budget_eval["margin_pct"], 2),
                "science_value": science_value,
                "comms_viable": comms_eval["is_viable"],
                "risk_level": risk_eval["risk_level"],
            },
        }
        return result

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _invalid_result(self, validation_result: dict[str, Any]) -> dict[str, Any]:
        errors = list(validation_result["errors"])
        return {
            "mission_status": "INVALID",
            "score": 0.0,
            "total_mass_kg": None,
            "payload_capacity_kg": None,
            "total_cost_m_usd": None,
            "budget_allocated_m_usd": None,
            "power_balance": None,
            "orbit": None,
            "recommendations": [f"Fix configuration error: {err}" for err in errors],
            "risk_level": risk.RISK_CRITICAL,
            "risk_score": 100.0,
            "checks": [],
            "warnings": list(validation_result["warnings"]),
            "feasibility": {
                "feasible": False,
                "errors": errors,
                "warnings": list(validation_result["warnings"]),
            },
            "communication": None,
            "mass": None,
            "budget": None,
            "success_indicators": {
                "mass_margin_pct": None,
                "power_margin_pct": None,
                "budget_margin_pct": None,
                "science_value": self._science_value(),
                "comms_viable": False,
                "risk_level": risk.RISK_CRITICAL,
            },
        }

    def _budget_reserve_pct(self) -> float:
        try:
            return float(self.resources.get("budget_reserve_pct", 0.0) or 0.0)
        except (TypeError, ValueError):
            return 0.0

    def _launcher_reliability(self) -> float | None:
        value = self.launcher.get("reliability")
        if value is None:
            return None
        try:
            reliability = float(value)
        except (TypeError, ValueError):
            return None
        return max(0.0, min(1.0, reliability))

    def _science_value(self) -> float:
        scores = []
        for instrument in self.instruments:
            try:
                scores.append(float(instrument.get("utility_score", 50.0)))
            except (TypeError, ValueError, AttributeError):
                scores.append(50.0)
        if not scores:
            return 0.0
        return round(sum(scores) / len(scores), 2)

    def _score(self, success: bool, science_value: float, mass_eval: dict[str, Any], power_eval: dict[str, Any]) -> float:
        score = 50.0 if success else 20.0
        score += (science_value / 100.0) * 20.0
        score += max(0.0, min(15.0, mass_eval["margin_pct"] / 20.0 * 15.0))
        score += max(0.0, min(15.0, power_eval["balance_pct"] / 20.0 * 15.0))
        return max(0.0, min(100.0, score))

    def _recommendations(
        self,
        mass_eval: dict[str, Any],
        power_eval: dict[str, Any],
        budget_eval: dict[str, Any],
        comms_eval: dict[str, Any],
        warnings: list[str],
    ) -> list[str]:
        recommendations: list[str] = []
        if not mass_eval["compatible"]:
            recommendations.append("Reduce spacecraft payload mass or select a launcher with higher payload capacity.")
        if not power_eval["is_viable"]:
            recommendations.append("Optimize scientific instrument power consumption or increase solar array generation.")
        if not budget_eval["within_budget"]:
            recommendations.append("Reduce spacecraft/instrument costs or increase the allocated mission budget.")
        if not comms_eval["is_viable"]:
            recommendations.append("Add ground stations, increase downlink rate, or reduce data volume requirements.")
        if not recommendations:
            recommendations = []
        return recommendations
