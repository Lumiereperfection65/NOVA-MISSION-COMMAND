"""Adapter for the in-repository NOVA MissionSimulation engine."""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any

from app.core.exceptions import SimulationExecutionError
from app.services.engines.base import SimulationEngineAdapter

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[4]
SIMULATION_DIR = PROJECT_ROOT / "simulation"


class NovaMissionSimulationAdapter(SimulationEngineAdapter):
    """Wraps ``simulation.engine.MissionSimulation`` without modifying the engine."""

    def __init__(self) -> None:
        self._engine_cls = self._load_engine_class()

    @property
    def name(self) -> str:
        return "NOVA MissionSimulation"

    @property
    def is_mock(self) -> bool:
        return False

    def is_available(self) -> bool:
        return self._engine_cls is not None

    def execute(self, configuration: dict[str, Any]) -> dict[str, Any]:
        if self._engine_cls is None:
            raise SimulationExecutionError("Live simulation engine is not loaded.")
        try:
            simulation = self._engine_cls(
                spacecraft=configuration["spacecraft"],
                instruments=configuration["instruments"],
                launcher=configuration["launcher"],
                orbit=configuration["orbit"],
                budget_allocated=configuration["budget_allocated"],
            )
            return simulation.run_full_simulation()
        except SimulationExecutionError:
            raise
        except Exception as exc:
            logger.exception("Live simulation engine failed")
            raise SimulationExecutionError("The simulation engine failed to execute.") from exc

    @staticmethod
    def _load_engine_class() -> Any | None:
        simulation_path = str(SIMULATION_DIR)
        if simulation_path not in sys.path:
            sys.path.insert(0, simulation_path)
        try:
            from engine import MissionSimulation  # type: ignore[import-not-found]

            return MissionSimulation
        except Exception:
            logger.warning("Unable to import simulation.engine.MissionSimulation", exc_info=True)
            return None
