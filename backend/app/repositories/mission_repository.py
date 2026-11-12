"""Mission persistence operations."""

import logging
from datetime import datetime, timezone

from sqlalchemy import Select, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.exceptions import DatabaseError, MissionNotFoundError
from app.models.mission import Mission
from app.schemas.mission import MissionStatus

logger = logging.getLogger(__name__)


class MissionRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list(
        self,
        *,
        page: int,
        page_size: int,
        status: MissionStatus | None = None,
    ) -> tuple[list[Mission], int]:
        try:
            filters = []
            if status is not None:
                filters.append(Mission.status == status.value)

            count_stmt: Select[tuple[int]] = select(func.count()).select_from(Mission)
            list_stmt: Select[tuple[Mission]] = select(Mission).order_by(Mission.created_at.desc())
            if filters:
                count_stmt = count_stmt.where(*filters)
                list_stmt = list_stmt.where(*filters)

            total = int(self.session.execute(count_stmt).scalar_one())
            offset = (page - 1) * page_size
            items = list(self.session.execute(list_stmt.offset(offset).limit(page_size)).scalars().all())
            return items, total
        except SQLAlchemyError as exc:
            logger.exception("Failed to list missions")
            raise DatabaseError() from exc

    def get(self, mission_id: str) -> Mission | None:
        try:
            return self.session.get(Mission, mission_id)
        except SQLAlchemyError as exc:
            logger.exception("Failed to load mission %s", mission_id)
            raise DatabaseError() from exc

    def get_or_raise(self, mission_id: str) -> Mission:
        mission = self.get(mission_id)
        if mission is None:
            raise MissionNotFoundError(mission_id)
        return mission

    def add(self, mission: Mission) -> Mission:
        try:
            self.session.add(mission)
            self.session.flush()
            self.session.refresh(mission)
            return mission
        except SQLAlchemyError as exc:
            logger.exception("Failed to create mission")
            raise DatabaseError() from exc

    def save(self, mission: Mission) -> Mission:
        try:
            mission.updated_at = datetime.now(timezone.utc)
            self.session.flush()
            self.session.refresh(mission)
            return mission
        except SQLAlchemyError as exc:
            logger.exception("Failed to update mission %s", mission.id)
            raise DatabaseError() from exc

    def delete(self, mission: Mission) -> None:
        try:
            self.session.delete(mission)
            self.session.flush()
        except SQLAlchemyError as exc:
            logger.exception("Failed to delete mission %s", mission.id)
            raise DatabaseError() from exc
