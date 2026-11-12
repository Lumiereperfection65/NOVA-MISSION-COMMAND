"""Explicit mock adapter used only when the live engine cannot be loaded."""

from typing import Any

from app.services.engines.base import SimulationEngineAdapter


class MockSimulationAdapter(SimulationEngineAdapter):
    """Deterministic mock. Results are always labeled as mock, never as live."""

    @property
    def name(self) -> str:
        return "MockSimulationAdapter"

    @property
    def is_mock(self) -> bool:
        return True

    def is_available(self) -> bool:
        return True

    def execute(self, configuration: dict[str, Any]) -> dict[str, Any]:
        instruments = configuration.get("instruments") or []
        spacecraft = configuration.get("spacecraft") or {}
        launcher = configuration.get("launcher") or {}
        orbit = configuration.get("orbit") or {}
        budget = float(configuration.get("budget_allocated") or 0)

        total_mass = (
            float(spacecraft.get("base_mass") or 0)
            + float(spacecraft.get("fuel_mass") or 0)
            + sum(float(item.get("mass") or 0) for item in instruments)
        )
        total_cost = (
            float(spacecraft.get("cost") or 0)
            + float(launcher.get("cost") or 0)
            + sum(float(item.get("cost") or 0) for item in instruments)
        )
        success = total_mass <= float(launcher.get("payload_capacity") or 0) and total_cost <= budget

        return {
            "mission_status": "SUCCESS" if success else "FAILED",
            "score": 40.0 if success else 10.0,
            "total_mass_kg": total_mass,
            "total_cost_m_usd": total_cost,
            "orbit": {
                "altitude_km": orbit.get("altitude_km"),
                "inclination_deg": orbit.get("inclination_deg"),
            },
            "recommendations": [] if success else ["Mock evaluation failed mass or budget checks."],
            "mock": True,
            "note": "This result was produced by MockSimulationAdapter, not the live NOVA engine.",
        }
