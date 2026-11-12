"""Mission lifecycle operations."""

from sqlalchemy.orm import Session

from app.core.exceptions import InvalidMissionOperationError
from app.models.mission import Mission
from app.repositories.mission_repository import MissionRepository
from app.schemas.mission import MissionCreate, MissionListResponse, MissionRead, MissionStatus, MissionUpdate


class MissionService:
    def __init__(self, session: Session) -> None:
        self.repository = MissionRepository(session)

    def list_missions(
        self,
        *,
        page: int,
        page_size: int,
        status: MissionStatus | None = None,
    ) -> MissionListResponse:
        if page < 1:
            raise InvalidMissionOperationError("page must be greater than or equal to 1.")
        if page_size < 1 or page_size > 100:
            raise InvalidMissionOperationError("page_size must be between 1 and 100.")

        items, total = self.repository.list(page=page, page_size=page_size, status=status)
        return MissionListResponse(
            items=[MissionRead.model_validate(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    def create_mission(self, payload: MissionCreate) -> MissionRead:
        mission = Mission(
            name=payload.name,
            description=payload.description,
            mission_type=payload.mission_type.value,
            destination=payload.destination,
            launch_date=payload.launch_date,
            duration=payload.duration,
            status=payload.status.value,
            configuration=payload.configuration.model_dump() if payload.configuration else None,
        )
        stored = self.repository.add(mission)
        return MissionRead.model_validate(stored)

    def get_mission(self, mission_id: str) -> MissionRead:
        return MissionRead.model_validate(self.repository.get_or_raise(mission_id))

    def update_mission(self, mission_id: str, payload: MissionUpdate) -> MissionRead:
        mission = self.repository.get_or_raise(mission_id)
        updates = payload.model_dump(exclude_unset=True)

        if "name" in updates and updates["name"] is not None:
            mission.name = updates["name"].strip()
        if "description" in updates:
            mission.description = updates["description"]
        if "mission_type" in updates and updates["mission_type"] is not None:
            mission.mission_type = (
                updates["mission_type"].value
                if hasattr(updates["mission_type"], "value")
                else updates["mission_type"]
            )
        if "destination" in updates and updates["destination"] is not None:
            mission.destination = updates["destination"].strip()
        if "launch_date" in updates:
            mission.launch_date = updates["launch_date"]
        if "duration" in updates and updates["duration"] is not None:
            mission.duration = updates["duration"]
        if "status" in updates and updates["status"] is not None:
            mission.status = (
                updates["status"].value if hasattr(updates["status"], "value") else updates["status"]
            )
        if "configuration" in updates:
            configuration = updates["configuration"]
            if configuration is None:
                mission.configuration = None
            elif hasattr(configuration, "model_dump"):
                mission.configuration = configuration.model_dump()
            else:
                mission.configuration = configuration

        stored = self.repository.save(mission)
        return MissionRead.model_validate(stored)

    def delete_mission(self, mission_id: str) -> None:
        mission = self.repository.get_or_raise(mission_id)
        self.repository.delete(mission)
