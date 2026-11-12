"""Environment-based application settings."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent
DEFAULT_DATABASE_PATH = PROJECT_ROOT / "database" / "nova.db"


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables and optional .env."""

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "NOVA Mission Command API"
    app_version: str = "1.0.0"
    app_description: str = (
        "Backend API for NOVA MISSION COMMAND: mission management, "
        "configuration, persistence, and simulation orchestration."
    )
    environment: str = "development"
    debug: bool = False
    log_level: str = "INFO"

    database_url: str = Field(default=f"sqlite:///{DEFAULT_DATABASE_PATH.as_posix()}")
    cors_origins: str = "http://localhost:3000,http://localhost:8000"
    cors_allow_credentials: bool = True
    simulation_force_mock: bool = False

    @field_validator("environment")
    @classmethod
    def normalize_environment(cls, value: str) -> str:
        return value.lower().strip()

    @model_validator(mode="after")
    def reject_wildcard_cors_with_credentials(self) -> "Settings":
        if self.cors_allow_credentials and "*" in self.cors_origin_list:
            raise ValueError("CORS wildcard origins cannot be combined with credentials.")
        return self

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [item.strip() for item in self.cors_origins.split(",") if item.strip()]
        return origins or ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
