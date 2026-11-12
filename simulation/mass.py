"""Spacecraft mass and payload constraints."""

from typing import Any

try:
    from simulation.models import coerce_float, make_check, margin_pct
except ImportError:  # imported as top-level module with simulation/ on sys.path
    from models import coerce_float, make_check, margin_pct


def calculate_total_mass(spacecraft: dict[str, Any], instruments: list[dict[str, Any]]) -> float:
    base_mass = coerce_float(spacecraft.get("base_mass", 150.0), 150.0)
    fuel_mass = coerce_float(spacecraft.get("fuel_mass", 300.0), 300.0)
    instrument_mass = sum(coerce_float(item.get("mass", 20.0), 20.0) for item in instruments)
    return float(base_mass + fuel_mass + instrument_mass)


def evaluate(
    spacecraft: dict[str, Any],
    instruments: list[dict[str, Any]],
    launcher: dict[str, Any],
) -> dict[str, Any]:
    total_mass = calculate_total_mass(spacecraft, instruments)
    capacity = coerce_float(launcher.get("payload_capacity", 1000.0), 1000.0)
    margin = capacity - total_mass
    compatible = total_mass <= capacity if capacity > 0 else False
    return {
        "total_mass_kg": total_mass,
        "payload_capacity_kg": capacity,
        "compatible": compatible,
        "margin_kg": margin,
        "margin_pct": margin_pct(margin, capacity),
        "check": make_check("mass", compatible, total_mass, capacity),
    }
