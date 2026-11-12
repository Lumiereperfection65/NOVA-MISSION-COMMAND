"""Mission configuration validation and feasibility analysis.

All functions are defensive: invalid input produces structured errors,
never exceptions.
"""

from typing import Any


def _check_number(
    value: Any,
    name: str,
    errors: list[str],
    minimum: float | None = None,
    maximum: float | None = None,
    required: bool = False,
) -> float | None:
    if value is None:
        if required:
            errors.append(f"{name} is required.")
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        try:
            value = float(value)
        except (TypeError, ValueError):
            errors.append(f"{name} must be a number.")
            return None
    value = float(value)
    if minimum is not None and value < minimum:
        errors.append(f"{name} must be >= {minimum} (got {value}).")
    if maximum is not None and value > maximum:
        errors.append(f"{name} must be <= {maximum} (got {value}).")
    return value


def validate_configuration(
    spacecraft: Any,
    instruments: Any,
    launcher: Any,
    orbit: Any,
    budget_allocated: Any,
) -> dict[str, Any]:
    """Validate a mission configuration.

    Returns {"feasible": bool, "errors": [...], "warnings": [...]}.
    """
    errors: list[str] = []
    warnings: list[str] = []

    if not isinstance(spacecraft, dict):
        errors.append("spacecraft must be an object.")
        spacecraft = {}
    if not isinstance(launcher, dict):
        errors.append("launcher must be an object.")
        launcher = {}
    if not isinstance(orbit, dict):
        errors.append("orbit must be an object.")
        orbit = {}
    if not isinstance(instruments, list):
        errors.append("instruments must be a list.")
        instruments = []

    _check_number(spacecraft.get("base_mass", 150.0), "spacecraft.base_mass", errors, minimum=0.0, required=False)
    if spacecraft.get("base_mass", 150.0) is not None and spacecraft.get("base_mass", 150.0) <= 0:
        errors.append("spacecraft.base_mass must be > 0.")
    _check_number(spacecraft.get("fuel_mass", 300.0), "spacecraft.fuel_mass", errors, minimum=0.0)
    _check_number(spacecraft.get("solar_power_generation", 250.0), "spacecraft.solar_power_generation", errors, minimum=0.0)
    _check_number(spacecraft.get("base_power_consumption", 50.0), "spacecraft.base_power_consumption", errors, minimum=0.0)
    _check_number(spacecraft.get("cost", 50.0), "spacecraft.cost", errors, minimum=0.0)

    if not instruments:
        errors.append("At least one instrument is required.")
    for index, instrument in enumerate(instruments):
        prefix = f"instruments[{index}]"
        if not isinstance(instrument, dict):
            errors.append(f"{prefix} must be an object.")
            continue
        mass = _check_number(instrument.get("mass", 20.0), f"{prefix}.mass", errors, minimum=0.0)
        if mass is not None and mass <= 0:
            errors.append(f"{prefix}.mass must be > 0.")
        _check_number(instrument.get("cost", 15.0), f"{prefix}.cost", errors, minimum=0.0)
        _check_number(instrument.get("power_consumption", 25.0), f"{prefix}.power_consumption", errors, minimum=0.0)
        utility = _check_number(instrument.get("utility_score", 50.0), f"{prefix}.utility_score", errors, minimum=0.0, maximum=100.0)
        if utility is None:
            warnings.append(f"{prefix}.utility_score missing; science value will be understated.")

    capacity = _check_number(launcher.get("payload_capacity", 1000.0), "launcher.payload_capacity", errors, minimum=0.0)
    if capacity is not None and capacity <= 0:
        errors.append("launcher.payload_capacity must be > 0.")
    _check_number(launcher.get("cost", 80.0), "launcher.cost", errors, minimum=0.0)
    reliability = _check_number(launcher.get("reliability"), "launcher.reliability", errors, minimum=0.0, maximum=1.0)

    altitude = _check_number(orbit.get("altitude_km", 400.0), "orbit.altitude_km", errors, minimum=0.0, maximum=1_000_000.0)
    if altitude is not None and altitude <= 0:
        errors.append("orbit.altitude_km must be > 0.")
    _check_number(orbit.get("inclination_deg", 28.5), "orbit.inclination_deg", errors, minimum=0.0, maximum=180.0)

    budget = _check_number(budget_allocated, "budget_allocated", errors, minimum=0.0, required=True)
    if budget is not None and budget <= 0:
        errors.append("budget_allocated must be > 0.")

    if reliability is not None and reliability < 0.8:
        warnings.append("launcher.reliability below 0.8; mission risk is elevated.")

    return {
        "feasible": not errors,
        "errors": errors,
        "warnings": warnings,
    }
