"""Basic orbital and trajectory constraints (Earth-centered, two-body)."""

import math
from typing import Any

try:
    from simulation.models import coerce_float
except ImportError:
    from models import coerce_float

MU_EARTH = 398600.4418  # km^3/s^2
EARTH_RADIUS_KM = 6371.0


def orbital_regime(altitude_km: float) -> str:
    if altitude_km < 2000.0:
        return "LEO"
    if altitude_km < 20000.0:
        return "MEO"
    if altitude_km <= 36500.0:
        return "GEO"
    return "HEO"


def radiation_exposure(altitude_km: float) -> str:
    if altitude_km < 1000.0:
        return "Low"
    if altitude_km < 20000.0:
        return "Moderate"
    return "High"


def simulate_orbit(orbit: dict[str, Any]) -> dict[str, Any]:
    altitude_km = coerce_float(orbit.get("altitude_km", 400.0), 400.0)
    inclination_deg = coerce_float(orbit.get("inclination_deg", 28.5), 28.5)
    radius = EARTH_RADIUS_KM + max(altitude_km, 0.0)

    period_seconds = 2.0 * math.pi * math.sqrt(radius**3 / MU_EARTH)
    velocity = math.sqrt(MU_EARTH / radius)

    return {
        "altitude_km": altitude_km,
        "inclination_deg": inclination_deg,
        "orbital_period_minutes": round(period_seconds / 60.0, 2),
        "orbital_velocity_kms": round(velocity, 3),
        "regime": orbital_regime(altitude_km),
        "radiation_exposure_level": radiation_exposure(altitude_km),
    }
