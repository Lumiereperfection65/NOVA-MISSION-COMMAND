"""Mission CRUD endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.api.deps import get_mission_service
from app.schemas.common import ErrorResponse
from app.schemas.mission import (
    MissionCreate,
    MissionListResponse,
    MissionRead,
    MissionStatus,
    MissionUpdate,
)
from app.services.mission_service import MissionService

router = APIRouter(prefix="/missions", tags=["Missions"])

ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Invalid operation"},
    404: {"model": ErrorResponse, "description": "Mission not found"},
    422: {"model": ErrorResponse, "description": "Validation error"},
}


@router.get(
    "",
    response_model=MissionListResponse,
    summary="List missions",
    description="Retrieve registered missions with pagination and optional status filtering.",
    responses=ERROR_RESPONSES,
)
def list_missions(
    service: Annotated[MissionService, Depends(get_mission_service)],
    page: int = Query(1, ge=1, description="1-based page number."),
    page_size: int = Query(20, ge=1, le=100, description="Number of missions per page."),
    status_filter: MissionStatus | None = Query(
        default=None,
        alias="status",
        description="Filter by mission status.",
    ),
) -> MissionListResponse:
    return service.list_missions(
        page=page,
        page_size=page_size,
        status=status_filter,
    )


@router.post(
    "",
    response_model=MissionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a mission",
    description="Validate the payload, generate a unique identifier, and persist the mission.",
    responses=ERROR_RESPONSES,
)
def create_mission(
    payload: MissionCreate,
    service: Annotated[MissionService, Depends(get_mission_service)],
) -> MissionRead:
    return service.create_mission(payload)


@router.get(
    "/{mission_id}",
    response_model=MissionRead,
    summary="Get a mission",
    description="Retrieve a mission by unique identifier.",
    responses=ERROR_RESPONSES,
)
def get_mission(
    mission_id: str,
    service: Annotated[MissionService, Depends(get_mission_service)],
) -> MissionRead:
    return service.get_mission(mission_id)


@router.put(
    "/{mission_id}",
    response_model=MissionRead,
    summary="Update a mission",
    description="Update an existing mission while preserving data consistency.",
    responses=ERROR_RESPONSES,
)
def update_mission(
    mission_id: str,
    payload: MissionUpdate,
    service: Annotated[MissionService, Depends(get_mission_service)],
) -> MissionRead:
    return service.update_mission(mission_id, payload)


@router.delete(
    "/{mission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a mission",
    description="Delete an existing mission. Returns 404 when the mission does not exist.",
    responses=ERROR_RESPONSES,
)
def delete_mission(
    mission_id: str,
    service: Annotated[MissionService, Depends(get_mission_service)],
) -> Response:
    service.delete_mission(mission_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
