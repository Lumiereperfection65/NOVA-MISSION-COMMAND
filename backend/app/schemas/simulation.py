"""Simulation request/response schemas, including the legacy frontend contract."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.mission import InstrumentConfig, MissionConfiguration


class SimulationResult(BaseModel):
    mission_id: str
    execution_status: Literal["completed", "failed"]
    engine_mode: Literal["live", "mock"]
    engine_name: str
    mock: bool = Field(
        description="True only for mock adapter results. Live engine results always set this to false."
    )
    mission_status: str
    score: float | None = None
    result: dict[str, Any]


class LegacySimulationRequest(BaseModel):
    """Preserves the existing POST /api/simulate payload used by the frontend."""

    model_config = ConfigDict(extra="allow")

    name: str
    destination: str
    duration_days: int = Field(..., ge=1)
    difficulty: str
    budget_allocated: float = Field(..., gt=0)
    spacecraft: dict[str, Any]
    instruments: list[InstrumentConfig]
    launcher: dict[str, Any]
    orbit: dict[str, Any]

    def to_configuration(self) -> MissionConfiguration:
        return MissionConfiguration.model_validate(
            {
                "budget_allocated": self.budget_allocated,
                "difficulty": self.difficulty,
                "spacecraft": self.spacecraft,
                "instruments": [item.model_dump() for item in self.instruments],
                "launcher": self.launcher,
                "orbit": self.orbit,
            }
        )
