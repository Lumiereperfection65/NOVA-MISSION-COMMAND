"""Domain exceptions and HTTP error payload helpers."""

from typing import Any


class AppError(Exception):
    """Base application error."""

    def __init__(
        self,
        message: str,
        *,
        code: str,
        status_code: int,
        details: Any | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class MissionNotFoundError(AppError):
    def __init__(self, mission_id: str) -> None:
        super().__init__(
            f"Mission '{mission_id}' was not found.",
            code="MISSION_NOT_FOUND",
            status_code=404,
            details={"mission_id": mission_id},
        )


class InvalidMissionOperationError(AppError):
    def __init__(self, message: str, details: Any | None = None) -> None:
        super().__init__(
            message,
            code="INVALID_OPERATION",
            status_code=400,
            details=details,
        )


class SimulationEngineUnavailableError(AppError):
    def __init__(self, message: str = "Simulation engine is unavailable.") -> None:
        super().__init__(
            message,
            code="SIMULATION_ENGINE_UNAVAILABLE",
            status_code=503,
        )


class SimulationExecutionError(AppError):
    def __init__(self, message: str, details: Any | None = None) -> None:
        super().__init__(
            message,
            code="SIMULATION_EXECUTION_FAILED",
            status_code=500,
            details=details,
        )


class DatabaseError(AppError):
    def __init__(self, message: str = "A database error occurred.") -> None:
        super().__init__(
            message,
            code="DATABASE_ERROR",
            status_code=500,
        )
