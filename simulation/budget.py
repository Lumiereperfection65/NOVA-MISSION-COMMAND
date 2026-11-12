"""Mission budget calculations with optional reserve percentage."""

from typing import Any

try:
    from simulation.models import coerce_float, make_check, margin_pct
except ImportError:
    from models import coerce_float, make_check, margin_pct


def calculate_total_cost(
    spacecraft: dict[str, Any],
    instruments: list[dict[str, Any]],
    launcher: dict[str, Any],
) -> float:
    sc_cost = coerce_float(spacecraft.get("cost", 50.0), 50.0)
    launcher_cost = coerce_float(launcher.get("cost", 80.0), 80.0)
    instrument_cost = sum(coerce_float(item.get("cost", 15.0), 15.0) for item in instruments)
    return float(sc_cost + launcher_cost + instrument_cost)


def evaluate(
    spacecraft: dict[str, Any],
    instruments: list[dict[str, Any]],
    launcher: dict[str, Any],
    budget_allocated: Any,
    reserve_pct: float = 0.0,
) -> dict[str, Any]:
    total_cost = calculate_total_cost(spacecraft, instruments, launcher)
    budget = coerce_float(budget_allocated, 0.0)
    reserve_pct = max(0.0, min(coerce_float(reserve_pct, 0.0), 90.0))
    usable_budget = budget * (1.0 - reserve_pct / 100.0)
    margin = usable_budget - total_cost
    within_budget = total_cost <= usable_budget if usable_budget > 0 else False
    return {
        "total_cost_m_usd": total_cost,
        "budget_allocated_m_usd": budget,
        "budget_reserve_pct": reserve_pct,
        "usable_budget_m_usd": round(usable_budget, 4),
        "margin_m_usd": margin,
        "margin_pct": margin_pct(margin, usable_budget),
        "within_budget": within_budget,
        "check": make_check("budget", within_budget, total_cost, usable_budget),
    }
