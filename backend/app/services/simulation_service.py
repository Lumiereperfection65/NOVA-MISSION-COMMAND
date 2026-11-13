"""Prepare, execute, and persist mission simulations."""

import logging
from typing import Any

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.exceptions import InvalidMissionOperationError, SimulationEngineUnavailableError
from app.models.mission import Mission
from app.repositories.mission_repository import MissionRepository
from app.schemas.mission import MissionConfiguration, MissionStatus
from app.schemas.simulation import SimulationResult
from app.services.engines.base import SimulationEngineAdapter
from app.services.engines.factory import get_simulation_engine

logger = logging.getLogger(__name__)


class SimulationService:
    def __init__(self, session: Session, engine: SimulationEngineAdapter | None = None) -> None:
        self.repository = MissionRepository(session)
        self.engine = engine or get_simulation_engine()

    def engine_status(self) -> dict[str, Any]:
        available = self.engine.is_available()
        return {
            "available": available,
            "name": self.engine.name,
            "mode": self.engine.mode,
            "mock": self.engine.is_mock,
            "detail": None if available else "Simulation engine adapter reported unavailable.",
        }

    def simulate_mission(self, mission_id: str) -> SimulationResult:
        mission = self.repository.get_or_raise(mission_id)
        configuration = self._validate_configuration(mission)
        prepared = configuration.model_dump()

        if not self.engine.is_available():
            raise SimulationEngineUnavailableError()

        mission.status = MissionStatus.SIMULATING.value
        self.repository.save(mission)
        self.repository.session.commit()

        logger.info(
            "Executing simulation for mission %s via %s (mock=%s)",
            mission.id,
            self.engine.name,
            self.engine.is_mock,
        )
        try:
            raw_result = self.engine.execute(prepared)
        except Exception:
            mission.status = MissionStatus.FAILED.value
            self.repository.save(mission)
            self.repository.session.commit()
            raise
        return self._process_result(mission, raw_result)

    def run_configuration(self, configuration: MissionConfiguration) -> dict[str, Any]:
        if not self.engine.is_available():
            raise SimulationEngineUnavailableError()
        result = self.engine.execute(configuration.model_dump())
        return self._annotate_engine_metadata(result)

    def _validate_configuration(self, mission: Mission) -> MissionConfiguration:
        if not mission.configuration:
            raise InvalidMissionOperationError(
                "Mission configuration is required before a simulation can run.",
                details={"mission_id": mission.id},
            )
        try:
            return MissionConfiguration.model_validate(mission.configuration)
        except ValidationError as exc:
            logger.warning(
                "Stored mission configuration failed validation for mission %s",
                mission.id,
            )
            raise InvalidMissionOperationError(
                "Mission configuration is invalid and cannot be simulated.",
                details={"mission_id": mission.id},
            ) from exc

    def _process_result(self, mission: Mission, raw_result: dict[str, Any]) -> SimulationResult:
        annotated = self._annotate_engine_metadata(raw_result)
        engine_status = str(annotated.get("mission_status", "")).upper()
        succeeded = engine_status == "SUCCESS"
        mission.status = MissionStatus.COMPLETED.value if succeeded else MissionStatus.FAILED.value
        mission.last_simulation = annotated
        stored = self.repository.save(mission)

        return SimulationResult(
            mission_id=stored.id,
            execution_status="completed" if succeeded else "failed",
            engine_mode=self.engine.mode,  # type: ignore[arg-type]
            engine_name=self.engine.name,
            mock=self.engine.is_mock,
            mission_status=annotated.get("mission_status", "UNKNOWN"),
            score=annotated.get("score"),
            result=annotated,
        )

    def _annotate_engine_metadata(self, result: dict[str, Any]) -> dict[str, Any]:
        annotated = dict(result)
        annotated["engine_name"] = self.engine.name
        annotated["engine_mode"] = self.engine.mode
        annotated["mock"] = self.engine.is_mock
        if self.engine.is_mock:
            annotated["mock_disclaimer"] = (
                "This is a mock simulation result and must not be treated as a live engine run."
            )
        return annotated
