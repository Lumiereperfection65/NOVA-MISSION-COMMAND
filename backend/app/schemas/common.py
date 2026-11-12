"""Shared API response schemas."""

from typing import Any, Literal

from pydantic import BaseModel, Field


class ErrorBody(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody


class HealthResponse(BaseModel):
    status: Literal["healthy"]
    name: str
    version: str
    environment: str


class ComponentStatus(BaseModel):
    available: bool
    detail: str | None = None


class DatabaseStatus(ComponentStatus):
    latency_ms: float | None = None


class SimulationEngineStatus(ComponentStatus):
    name: str
    mode: Literal["live", "mock"]
    mock: bool = Field(description="True when results come from a mock adapter, never a live engine.")


class SystemStatusResponse(BaseModel):
    application: str
    version: str
    environment: str
    status: Literal["operational", "degraded"]
    database: DatabaseStatus
    simulation_engine: SimulationEngineStatus
