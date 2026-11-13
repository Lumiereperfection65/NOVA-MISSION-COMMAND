"""Risk level derivation from mission margins and known hazards."""

from typing import Any

RISK_LOW = "LOW"
RISK_MEDIUM = "MEDIUM"
RISK_HIGH = "HIGH"
RISK_CRITICAL = "CRITICAL"


def _margin_penalty(margin_pct: float) -> float:
    if margin_pct < 0.0:
        return 40.0
    if margin_pct < 5.0:
        return 35.0
    if margin_pct < 10.0:
        return 25.0
    if margin_pct < 20.0:
        return 10.0
    return 0.0


def evaluate(
    mass_margin_pct: float,
    power_margin_pct: float,
    budget_margin_pct: float,
    launcher_reliability: float | None,
    radiation_level: str,
    comms_viable: bool,
) -> dict[str, Any]:
    score = 20.0
    score += _margin_penalty(mass_margin_pct)
    score += _margin_penalty(power_margin_pct)
    score += _margin_penalty(budget_margin_pct)

    if launcher_reliability is None:
        score += 10.0
    else:
        score += max(0.0, (1.0 - launcher_reliability)) * 40.0

    radiation_penalty = {"Low": 0.0, "Moderate": 10.0, "High": 20.0}.get(radiation_level, 10.0)
    score += radiation_penalty

    if not comms_viable:
        score += 15.0

    score = max(0.0, min(100.0, score))

    if score < 25.0:
        level = RISK_LOW
    elif score < 50.0:
        level = RISK_MEDIUM
    elif score < 75.0:
        level = RISK_HIGH
    else:
        level = RISK_CRITICAL

    return {
        "risk_score": round(score, 1),
        "risk_level": level,
    }
