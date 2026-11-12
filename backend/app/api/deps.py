"""FastAPI dependencies."""

from collections.abc import Generator

from fastapi import Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services.mission_service import MissionService
from app.services.simulation_service import SimulationService


def db_session() -> Generator[Session, None, None]:
    yield from get_db()


def get_mission_service(session: Session = Depends(db_session)) -> MissionService:
    return MissionService(session)


def get_simulation_service(session: Session = Depends(db_session)) -> SimulationService:
    return SimulationService(session)
