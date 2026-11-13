/**
 * NOVA MISSION COMMAND - Mission Builder types
 * Shapes mirror the FastAPI backend (backend/main.py) and simulation engine
 * (simulation/engine.py) so a built mission can be sent to /api/simulate as-is.
 */

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface Destination {
  id: string;
  name: string;
  description: string;
  /** Suggested orbit altitude around the target body, in km. */
  defaultAltitudeKm: number;
  /** Minimum realistic mission duration in days (transit + operations). */
  minDurationDays: number;
}

export interface SpacecraftBus {
  id: string;
  name: string;
  description: string;
  base_mass: number; // kg (dry mass of the bus)
  fuel_mass: number; // kg (default propellant load)
  max_fuel_mass: number; // kg (tank capacity)
  solar_power_generation: number; // W
  base_power_consumption: number; // W
  cost: number; // M USD
  max_instruments: number;
}

export interface Launcher {
  id: string;
  name: string;
  payload_capacity: number; // kg
  cost: number; // M USD
  reliability: number; // 0..1
}

export interface Instrument {
  id: string;
  name: string;
  mass: number; // kg
  cost: number; // M USD
  power_consumption: number; // W
  utility_score: number; // 0..100
}

export interface MissionDraft {
  name: string;
  objectives: string[];
  destinationId: string;
  duration_days: number;
  difficulty: Difficulty;
  budget_allocated: number; // M USD
  altitude_km: number;
  inclination_deg: number;
  spacecraftId: string | null;
  fuel_mass: number;
  launcherId: string | null;
  instrumentIds: string[];
}

export interface ConstraintBudget {
  used: number;
  limit: number;
  margin: number;
  /** used / limit, can exceed 1 when over budget. */
  ratio: number;
  ok: boolean;
}

export interface MissionConstraints {
  mass: ConstraintBudget; // kg vs launcher capacity
  power: ConstraintBudget; // W consumption vs generation
  budget: ConstraintBudget; // M USD cost vs allocated budget
  breakdown: {
    busMass: number;
    fuelMass: number;
    instrumentMass: number;
    busPower: number;
    instrumentPower: number;
    busCost: number;
    launcherCost: number;
    instrumentCost: number;
  };
}

export type IssueSeverity = 'error' | 'warning';
export type BuilderStep = 'mission' | 'spacecraft' | 'launcher' | 'payload' | 'review';

export interface ValidationIssue {
  field: string;
  step: BuilderStep;
  severity: IssueSeverity;
  message: string;
}

/** Payload accepted by POST /api/simulate. */
export interface MissionRequest {
  name: string;
  destination: string;
  duration_days: number;
  difficulty: Difficulty;
  budget_allocated: number;
  spacecraft: Record<string, number | string>;
  instruments: Omit<Instrument, 'id'>[];
  launcher: Record<string, number | string>;
  orbit: { altitude_km: number; inclination_deg: number };
}

/**
 * Response returned by POST /api/simulate.
 * When the engine rejects the configuration, mission_status is 'INVALID' and the
 * numeric fields are null.
 */
export interface SimulationResult {
  mission_status: 'SUCCESS' | 'FAILED' | 'INVALID';
  score: number;
  total_mass_kg: number | null;
  payload_capacity_kg: number | null;
  total_cost_m_usd: number | null;
  budget_allocated_m_usd: number | null;
  power_balance: { generation: number; consumption: number; balance: number; is_viable: boolean } | null;
  orbit: {
    altitude_km: number;
    inclination_deg: number;
    orbital_period_minutes: number;
    orbital_velocity_kms: number;
    radiation_exposure_level: string;
  } | null;
  recommendations: string[];
  /** Enriched fields from the modular engine (optional, absent in offline estimates). */
  risk_level?: string;
  risk_score?: number;
  warnings?: string[];
}
