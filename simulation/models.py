"""Shared helpers for simulation modules."""

from typing import Any


def coerce_float(value: Any, default: float = 0.0) -> float:
    """Best-effort float coercion; never raises."""
    if value is None or isinstance(value, bool):
        try:
            return float(value)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def margin_pct(margin: float, reference: float) -> float:
    if reference <= 0:
        return 0.0
    return (margin / reference) * 100.0


def make_check(name: str, passed: bool, value: float, limit: float | None = None) -> dict[str, Any]:
    return {
        "name": name,
        "passed": bool(passed),
        "value": round(value, 4),
        "limit": None if limit is None else round(limit, 4),
        "margin": None if limit is None else round(limit - value, 4),
    }
