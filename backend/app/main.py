"""FastAPI application factory for NOVA Mission Command."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.error_handlers import register_exception_handlers
from app.api.routes import catalog, health, missions, simulation
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.database.initialization import init_database


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_database()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)

    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=settings.app_description,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
        contact={"name": "Nova Tech Africa", "url": "https://www.spaceappschallenge.org/"},
        license_info={"name": "Project Internal"},
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(application)
    application.include_router(health.router)
    application.include_router(missions.router)
    application.include_router(simulation.router)
    application.include_router(catalog.router)

    @application.get("/", tags=["Health"], summary="Service banner")
    def root() -> dict[str, str]:
        return {
            "status": "online",
            "project": "NOVA MISSION COMMAND",
            "event": "NASA Space Apps Challenge 2026",
            "team": "Nova Tech Africa",
            "docs": "/docs",
        }

    return application


app = create_app()  # used by uvicorn main:app and backend.main:app
