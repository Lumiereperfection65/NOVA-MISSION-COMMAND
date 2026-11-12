"""Simulation engine adapter contract."""

from abc import ABC, abstractmethod
from typing import Any


class SimulationEngineAdapter(ABC):
    """Interface for executing a mission simulation.

    Implementations may wrap the in-repo physics engine or an external service.
    Mock adapters must set ``is_mock`` to True and never present themselves as live.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        raise NotImplementedError

    @property
    @abstractmethod
    def is_mock(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def is_available(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def execute(self, configuration: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @property
    def mode(self) -> str:
        return "mock" if self.is_mock else "live"
