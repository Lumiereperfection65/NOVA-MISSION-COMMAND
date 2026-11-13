"""Database file and schema initialization."""

import logging
from pathlib import Path

from sqlalchemy.engine import make_url

from app.core.config import DEFAULT_DATABASE_PATH, get_settings
from app.database.base import Base
from app.database.connection import get_engine
from app.models import mission as mission_model  # noqa: F401  # register metadata

logger = logging.getLogger(__name__)


def _ensure_sqlite_directory(database_url: str) -> None:
    url = make_url(database_url)
    if url.drivername != "sqlite":
        return
    database = url.database
    if not database or database == ":memory:":
        return
    Path(database).parent.mkdir(parents=True, exist_ok=True)


def init_database() -> None:
    """Create the SQLite directory if needed and initialize ORM tables.

    Reuses the project SQLite file at ``database/nova.db`` by default.
    Mission records are stored in ``nova_missions`` so the installer-created
    legacy ``missions(id, name)`` table is left untouched.
    """
    settings = get_settings()
    _ensure_sqlite_directory(settings.database_url)
    DEFAULT_DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized (%s)", settings.database_url)
