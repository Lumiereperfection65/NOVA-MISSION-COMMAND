"""Energy generation/consumption balance."""

from typing import Any

try:
    from simulation.models import coerce_float, make_check, margin_pct
except ImportError:
    from models import coerce_float, make_check, margin_pct


def calculate_power_balance(
    spacecraft: dict[str, Any],
    instruments: list[dict[str, Any]],
) -> dict[str, Any]:
    generation = coerce_float(spacecraft.get("solar_power_generation", 250.0), 250.0)
    base = coerce_float(spacecraft.get("base_power_consumption", 50.0), 50.0)
    instrument_draw = sum(coerce_float(item.get("power_consumption", 25.0), 25.0) for item in instruments)
    consumption = base + instrument_draw
    balance = generation - consumption
    viable = balance >= 0
    return {
        "generation": generation,
        "consumption": consumption,
        "balance": balance,
        "balance_pct": margin_pct(balance, generation),
        "is_viable": viable,
        "check": make_check("power", viable, consumption, generation),
    }
