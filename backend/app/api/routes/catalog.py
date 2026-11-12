"""Catalog endpoints preserved from the original backend."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/catalog", tags=["Catalog"])


@router.get("/launchers", summary="List available launch vehicles")
def get_launchers() -> list[dict[str, object]]:
    return [
        {"id": "nova-1", "name": "Nova-1 Light", "payload_capacity": 500.0, "cost": 30.0, "reliability": 0.95},
        {"id": "saturn-v-evo", "name": "Saturn-V Evo", "payload_capacity": 45000.0, "cost": 150.0, "reliability": 0.99},
        {"id": "falcon-heavy-x", "name": "Falcon Heavy X", "payload_capacity": 63800.0, "cost": 90.0, "reliability": 0.98},
    ]


@router.get("/instruments", summary="List scientific instruments")
def get_instruments() -> list[dict[str, object]]:
    return [
        {
            "id": "cam-hr",
            "name": "High-Res Optical Camera",
            "mass": 15.0,
            "cost": 12.0,
            "power_consumption": 20.0,
            "utility_score": 85.0,
        },
        {
            "id": "spec-ir",
            "name": "Infrared Spectrometer",
            "mass": 25.0,
            "cost": 22.0,
            "power_consumption": 35.0,
            "utility_score": 90.0,
        },
        {
            "id": "radar-sar",
            "name": "SAR Radar",
            "mass": 45.0,
            "cost": 40.0,
            "power_consumption": 60.0,
            "utility_score": 95.0,
        },
        {
            "id": "mag",
            "name": "Fluxgate Magnetometer",
            "mass": 5.0,
            "cost": 8.0,
            "power_consumption": 5.0,
            "utility_score": 70.0,
        },
    ]
