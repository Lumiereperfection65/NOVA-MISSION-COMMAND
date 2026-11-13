"""Simulation request/response schemas, including the legacy frontend contract."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.mission import (
    InstrumentConfig,
    LauncherConfig,
    MissionConfiguration,
    OrbitConfig,
    SpacecraftConfig,
)

# Request-body variants of the shared configuration models that also reject
# non-finite numbers (NaN, Infinity). They are local to POST /api/simulate so
# the models used by the /missions endpoints keep their current behaviour.
_FINITE_NUMBERS = ConfigDict(allow_inf_nan=False)


class LegacySpacecraftConfig(SpacecraftConfig):
    model_config = _FINITE_NUMBERS


class LegacyLauncherConfig(LauncherConfig):
    model_config = _FINITE_NUMBERS


class LegacyOrbitConfig(OrbitConfig):
    model_config = _FINITE_NUMBERS


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
    # Typed nested blocks: invalid or incomplete values are rejected while the
    # request is validated (HTTP 422), before the route body runs.
    spacecraft: LegacySpacecraftConfig
    instruments: list[InstrumentConfig] = Field(..., min_length=1)
    launcher: LegacyLauncherConfig
    orbit: LegacyOrbitConfig

    def to_configuration(self) -> MissionConfiguration:
        return MissionConfiguration.model_validate(
            {
                "budget_allocated": self.budget_allocated,
                "difficulty": self.difficulty,
                "spacecraft": self.spacecraft.model_dump(),
                "instruments": [item.model_dump() for item in self.instruments],
                "launcher": self.launcher.model_dump(),
                "orbit": self.orbit.model_dump(),
            }
        )
