"""Communication link constraints.

Simplified deterministic model: downlink rate and contact time are estimated
from the orbital regime, then compared against the required data volume.
Overrides can be supplied via the optional ``communication`` config dict
(``downlink_kbps``, ``data_volume_mb``, ``ground_stations``).
"""

from typing import Any

try:
    from simulation.models import coerce_float, make_check
except ImportError:
    from models import coerce_float, make_check

_REGIME_DEFAULTS = {
    "LEO": {"downlink_kbps": 2000.0, "contact_minutes_per_day": 40.0},
    "MEO": {"downlink_kbps": 500.0, "contact_minutes_per_day": 180.0},
    "GEO": {"downlink_kbps": 100.0, "contact_minutes_per_day": 1440.0},
    "HEO": {"downlink_kbps": 150.0, "contact_minutes_per_day": 60.0},
}


def regime_for_altitude(altitude_km: float) -> str:
    if altitude_km < 2000.0:
        return "LEO"
    if altitude_km < 20000.0:
        return "MEO"
    if altitude_km <= 36500.0:
        return "GEO"
    return "HEO"


def evaluate(
    orbit: dict[str, Any],
    instruments: list[dict[str, Any]],
    communication: dict[str, Any] | None = None,
) -> dict[str, Any]:
    communication = communication if isinstance(communication, dict) else {}
    altitude_km = coerce_float(orbit.get("altitude_km", 400.0), 400.0)
    regime = regime_for_altitude(altitude_km)
    defaults = _REGIME_DEFAULTS[regime]

    ground_stations = max(1, int(coerce_float(communication.get("ground_stations", 1), 1)))
    downlink_kbps = coerce_float(communication.get("downlink_kbps", defaults["downlink_kbps"]), defaults["downlink_kbps"])
    contact_minutes = defaults["contact_minutes_per_day"] * ground_stations
    contact_seconds = contact_minutes * 60.0

    default_volume = 200.0 * max(1, len(instruments))
    required_mb = coerce_float(
        communication.get("data_volume_mb", default_volume),
        default_volume,
    )

    daily_capacity_mb = (downlink_kbps * contact_seconds) / 8.0 / 1024.0
    margin_mb = daily_capacity_mb - required_mb
    viable = daily_capacity_mb >= required_mb

    return {
        "regime": regime,
        "ground_stations": ground_stations,
        "estimated_downlink_kbps": downlink_kbps,
        "contact_minutes_per_day": contact_minutes,
        "daily_downlink_capacity_mb": round(daily_capacity_mb, 3),
        "required_data_mb": required_mb,
        "margin_mb": round(margin_mb, 3),
        "is_viable": viable,
        "check": make_check("communication", viable, required_mb, daily_capacity_mb),
    }
