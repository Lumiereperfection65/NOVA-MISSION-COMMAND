"""Mission simulation endpoints."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, status

from app.api.deps import get_simulation_service
from app.schemas.common import ErrorResponse
from app.schemas.simulation import LegacySimulationRequest, SimulationResult
from app.services.simulation_service import SimulationService

router = APIRouter(tags=["Simulation"])

ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Invalid mission configuration"},
    404: {"model": ErrorResponse, "description": "Mission not found"},
    422: {"model": ErrorResponse, "description": "Validation error"},
    500: {"model": ErrorResponse, "description": "Simulation execution failed"},
    503: {"model": ErrorResponse, "description": "Simulation engine unavailable"},
}


@router.post(
    "/missions/{mission_id}/simulate",
    response_model=SimulationResult,
    summary="Execute a mission simulation",
    description=(
        "Load the mission, validate its configuration, prepare engine input, "
        "execute the simulation adapter, and return execution status plus results. "
        "Mock adapter results are explicitly labeled and are never reported as live runs."
    ),
    responses=ERROR_RESPONSES,
)
def simulate_mission(
    mission_id: str,
    simulation_service: Annotated[SimulationService, Depends(get_simulation_service)],
) -> SimulationResult:
    return simulation_service.simulate_mission(mission_id)


@router.post(
    "/api/simulate",
    summary="Legacy direct simulation",
    description=(
        "Compatibility endpoint used by the existing frontend. Runs the simulation "
        "engine directly from a request payload without persisting a mission record."
    ),
    status_code=status.HTTP_200_OK,
    responses=ERROR_RESPONSES,
)
def legacy_simulate(
    payload: LegacySimulationRequest,
    simulation_service: Annotated[SimulationService, Depends(get_simulation_service)],
) -> dict[str, Any]:
    return simulation_service.run_configuration(payload.to_configuration())
