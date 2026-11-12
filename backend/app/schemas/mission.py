"""Mission request/response schemas and nested configuration validation."""

from datetime import date, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class MissionStatus(str, Enum):
    DRAFT = "draft"
    PLANNED = "planned"
    READY = "ready"
    SIMULATING = "simulating"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class MissionType(str, Enum):
    EXPLORATION = "exploration"
    SCIENCE = "science"
    COMMUNICATION = "communication"
    EARTH_OBSERVATION = "earth_observation"
    CREWED = "crewed"
    CARGO = "cargo"
    TECHNOLOGY_DEMO = "technology_demo"


class InstrumentConfig(BaseModel):
    name: str = Field(..., min_length=1, max_length=120, examples=["High-Res Optical Camera"])
    mass: float = Field(..., gt=0, description="Instrument mass in kilograms.")
    cost: float = Field(..., ge=0, description="Instrument cost in millions USD.")
    power_consumption: float = Field(..., ge=0, description="Average power draw in watts.")
    utility_score: float = Field(..., ge=0, le=100, description="Scientific utility score (0-100).")


class SpacecraftConfig(BaseModel):
    base_mass: float = Field(..., gt=0, description="Dry spacecraft mass in kilograms.")
    fuel_mass: float = Field(..., ge=0, description="Propellant mass in kilograms.")
    solar_power_generation: float = Field(..., ge=0, description="Solar array output in watts.")
    base_power_consumption: float = Field(..., ge=0, description="Bus power draw in watts.")
    cost: float = Field(..., ge=0, description="Spacecraft cost in millions USD.")


class LauncherConfig(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    payload_capacity: float = Field(..., gt=0, description="Payload capacity in kilograms.")
    cost: float = Field(..., ge=0, description="Launch cost in millions USD.")
    reliability: float | None = Field(default=None, ge=0, le=1)


class OrbitConfig(BaseModel):
    altitude_km: float = Field(..., gt=0, le=1_000_000, description="Orbital altitude in kilometers.")
    inclination_deg: float = Field(..., ge=0, le=180, description="Inclination in degrees.")


class MissionConfiguration(BaseModel):
    """Simulation-ready payload aligned with the NOVA simulation engine."""

    model_config = ConfigDict(extra="allow")

    budget_allocated: float = Field(..., gt=0, description="Mission budget in millions USD.")
    difficulty: str | None = Field(default=None, max_length=64)
    spacecraft: SpacecraftConfig
    instruments: list[InstrumentConfig] = Field(..., min_length=1)
    launcher: LauncherConfig
    orbit: OrbitConfig


class MissionCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "name": "Lunar Explorer Alpha",
                    "description": "High-resolution lunar mapping mission.",
                    "mission_type": "exploration",
                    "destination": "Moon",
                    "launch_date": "2027-06-12",
                    "duration": 30,
                    "status": "planned",
                    "configuration": {
                        "budget_allocated": 200.0,
                        "difficulty": "Intermediate",
                        "spacecraft": {
                            "base_mass": 200.0,
                            "fuel_mass": 400.0,
                            "solar_power_generation": 300.0,
                            "base_power_consumption": 60.0,
                            "cost": 50.0,
                        },
                        "instruments": [
                            {
                                "name": "High-Res Optical Camera",
                                "mass": 15.0,
                                "cost": 12.0,
                                "power_consumption": 20.0,
                                "utility_score": 85.0,
                            }
                        ],
                        "launcher": {
                            "name": "Nova-1 Light",
                            "payload_capacity": 1000.0,
                            "cost": 50.0,
                            "reliability": 0.95,
                        },
                        "orbit": {"altitude_km": 100.0, "inclination_deg": 45.0},
                    },
                }
            ]
        }
    )

    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    mission_type: MissionType
    destination: str = Field(..., min_length=1, max_length=200)
    launch_date: date | None = None
    duration: int = Field(..., ge=1, le=36500, description="Mission duration in days.")
    status: MissionStatus = MissionStatus.DRAFT
    configuration: MissionConfiguration | None = None

    @field_validator("name", "destination")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be blank")
        return stripped


class MissionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    mission_type: MissionType | None = None
    destination: str | None = Field(default=None, min_length=1, max_length=200)
    launch_date: date | None = None
    duration: int | None = Field(default=None, ge=1, le=36500)
    status: MissionStatus | None = None
    configuration: MissionConfiguration | None = None

    @field_validator("name", "destination")
    @classmethod
    def strip_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be blank")
        return stripped

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> "MissionUpdate":
        updates = self.model_dump(exclude_unset=True)
        if not updates:
            raise ValueError("At least one field must be provided for an update.")
        for field_name in ("name", "mission_type", "destination", "duration", "status"):
            if field_name in updates and updates[field_name] is None:
                raise ValueError(f"{field_name} must not be null.")
        return self


class MissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    mission_type: MissionType
    destination: str
    launch_date: date | None
    duration: int
    status: MissionStatus
    configuration: dict[str, Any] | None
    last_simulation: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime


class MissionListResponse(BaseModel):
    items: list[MissionRead]
    total: int
    page: int
    page_size: int
