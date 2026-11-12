"""NOVA MISSION COMMAND — Space Mission Simulation Engine package."""

__version__ = "1.0.0"


def __getattr__(name: str):
    """Lazy import to avoid circular imports with simulation.engine."""
    if name == "MissionSimulation":
        from simulation.engine import MissionSimulation

        return MissionSimulation
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = ["MissionSimulation"]
