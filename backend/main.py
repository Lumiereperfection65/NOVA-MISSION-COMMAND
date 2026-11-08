"""
NOVA MISSION COMMAND - FastAPI Backend
NASA Space Apps Challenge 2026
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import sys

# Add simulation path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'simulation'))
from engine import MissionSimulation

app = FastAPI(title="Nova Mission Command API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class InstrumentModel(BaseModel):
    name: str
    mass: float
    cost: float
    power_consumption: float
    utility_score: float

class MissionRequest(BaseModel):
    name: str
    destination: str
    duration_days: int
    difficulty: str
    budget_allocated: float
    spacecraft: dict
    instruments: List[InstrumentModel]
    launcher: dict
    orbit: dict

@app.get("/")
def read_root():
    return {"status": "online", "project": "NOVA MISSION COMMAND", "event": "NASA Space Apps Challenge 2026", "team": "Nova Tech Africa"}

@app.post("/api/simulate")
def run_simulation(req: MissionRequest):
    instruments_dict = [i.model_dump() for i in req.instruments]
    sim = MissionSimulation(
        spacecraft=req.spacecraft,
        instruments=instruments_dict,
        launcher=req.launcher,
        orbit=req.orbit,
        budget_allocated=req.budget_allocated
    )
    result = sim.run_full_simulation()
    return result

@app.get("/api/catalog/launchers")
def get_launchers():
    return [
        {"id": "nova-1", "name": "Nova-1 Light", "payload_capacity": 500.0, "cost": 30.0, "reliability": 0.95},
        {"id": "saturn-v-evo", "name": "Saturn-V Evo", "payload_capacity": 45000.0, "cost": 150.0, "reliability": 0.99},
        {"id": "falcon-heavy-x", "name": "Falcon Heavy X", "payload_capacity": 63800.0, "cost": 90.0, "reliability": 0.98}
    ]

@app.get("/api/catalog/instruments")
def get_instruments():
    return [
        {"id": "cam-hr", "name": "High-Res Optical Camera", "mass": 15.0, "cost": 12.0, "power_consumption": 20.0, "utility_score": 85.0},
        {"id": "spec-ir", "name": "Infrared Spectrometer", "mass": 25.0, "cost": 22.0, "power_consumption": 35.0, "utility_score": 90.0},
        {"id": "radar-sar", "name": "SAR Radar", "mass": 45.0, "cost": 40.0, "power_consumption": 60.0, "utility_score": 95.0},
        {"id": "mag", "name": "Fluxgate Magnetometer", "mass": 5.0, "cost": 8.0, "power_consumption": 5.0, "utility_score": 70.0}
    ]
