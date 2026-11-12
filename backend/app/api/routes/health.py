"""Health and system status endpoints."""

import time
import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps import db_session, get_simulation_service
from app.core.config import Settings, get_settings
from app.schemas.common import (
    DatabaseStatus,
    HealthResponse,
    SimulationEngineStatus,
    SystemStatusResponse,
)
from app.services.simulation_service import SimulationService

router = APIRouter(tags=["Health"])
logger = logging.getLogger(__name__)


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="API health check",
    description="Returns API availability, application name, and version.",
)
def health(settings: Annotated[Settings, Depends(get_settings)]) -> HealthResponse:
    return HealthResponse(
        status="healthy",
        name=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
    )


@router.get(
    "/system/status",
    response_model=SystemStatusResponse,
    summary="Backend operational status",
    description="Reports database connectivity and simulation engine availability.",
)
def system_status(
    session: Annotated[Session, Depends(db_session)],
    simulation_service: Annotated[SimulationService, Depends(get_simulation_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SystemStatusResponse:
    database = _check_database(session)
    engine = simulation_service.engine_status()
    operational = database.available and engine["available"]
    return SystemStatusResponse(
        application=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
        status="operational" if operational else "degraded",
        database=database,
        simulation_engine=SimulationEngineStatus(
            available=engine["available"],
            detail=engine["detail"],
            name=engine["name"],
            mode=engine["mode"],
            mock=engine["mock"],
        ),
    )


def _check_database(session: Session) -> DatabaseStatus:
    started = time.perf_counter()
    try:
        session.execute(text("SELECT 1"))
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        return DatabaseStatus(available=True, detail="connected", latency_ms=latency_ms)
    except SQLAlchemyError:
        logger.exception("Database health check failed")
        session.rollback()
        return DatabaseStatus(available=False, detail="unreachable", latency_ms=None)
