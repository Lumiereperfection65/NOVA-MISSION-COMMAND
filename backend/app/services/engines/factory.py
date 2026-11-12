"""Select the live NOVA engine when available; otherwise an explicit mock."""

import logging

from app.core.config import get_settings
from app.services.engines.base import SimulationEngineAdapter
from app.services.engines.mock_engine import MockSimulationAdapter
from app.services.engines.nova_engine import NovaMissionSimulationAdapter

logger = logging.getLogger(__name__)


def get_simulation_engine() -> SimulationEngineAdapter:
    settings = get_settings()
    if settings.simulation_force_mock:
        logger.warning("SIMULATION_FORCE_MOCK is enabled; using MockSimulationAdapter")
        return MockSimulationAdapter()

    live = NovaMissionSimulationAdapter()
    if live.is_available():
        return live

    logger.warning("Live simulation engine unavailable; falling back to MockSimulationAdapter")
    return MockSimulationAdapter()
