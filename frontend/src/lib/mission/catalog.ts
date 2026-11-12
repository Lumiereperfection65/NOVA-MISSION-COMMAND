import type { Destination, Instrument, Launcher, MissionDraft, SpacecraftBus } from './types';

/**
 * Local catalog data.
 * Launchers and instruments are fallbacks mirroring backend/main.py — the live
 * values are fetched from /api/catalog/* when the backend is reachable.
 * Destinations and spacecraft buses have no backend endpoint yet.
 */

export const DESTINATIONS: Destination[] = [
  { id: 'leo', name: 'Low Earth Orbit', description: 'Earth observation, climate and technology demonstration.', defaultAltitudeKm: 400, minDurationDays: 1 },
  { id: 'geo', name: 'Geostationary Orbit', description: 'Telecom and continuous weather monitoring.', defaultAltitudeKm: 35786, minDurationDays: 7 },
  { id: 'moon', name: 'Moon', description: 'Lunar mapping, resource prospecting, surface science.', defaultAltitudeKm: 100, minDurationDays: 5 },
  { id: 'mars', name: 'Mars', description: 'Planetary geology, atmosphere and habitability studies.', defaultAltitudeKm: 300, minDurationDays: 210 },
  { id: 'asteroid', name: 'Near-Earth Asteroid', description: 'Small-body characterisation and planetary defence.', defaultAltitudeKm: 50, minDurationDays: 180 },
];

export const SPACECRAFT_BUSES: SpacecraftBus[] = [
  {
    id: 'cubesat-12u', name: 'CubeSat 12U', description: 'Low-cost nanosatellite for focused, short missions.',
    base_mass: 18, fuel_mass: 4, max_fuel_mass: 8, solar_power_generation: 60, base_power_consumption: 12, cost: 6, max_instruments: 2,
  },
  {
    id: 'smallsat-explorer', name: 'SmallSat Explorer', description: 'Versatile platform for Earth and lunar science.',
    base_mass: 150, fuel_mass: 200, max_fuel_mass: 400, solar_power_generation: 250, base_power_consumption: 50, cost: 50, max_instruments: 4,
  },
  {
    id: 'deep-space-orbiter', name: 'Deep Space Orbiter', description: 'High-power, long-endurance interplanetary platform.',
    base_mass: 600, fuel_mass: 1200, max_fuel_mass: 2500, solar_power_generation: 900, base_power_consumption: 180, cost: 220, max_instruments: 8,
  },
];

export const FALLBACK_LAUNCHERS: Launcher[] = [
  { id: 'nova-1', name: 'Nova-1 Light', payload_capacity: 500.0, cost: 30.0, reliability: 0.95 },
  { id: 'saturn-v-evo', name: 'Saturn-V Evo', payload_capacity: 45000.0, cost: 150.0, reliability: 0.99 },
  { id: 'falcon-heavy-x', name: 'Falcon Heavy X', payload_capacity: 63800.0, cost: 90.0, reliability: 0.98 },
];

export const FALLBACK_INSTRUMENTS: Instrument[] = [
  { id: 'cam-hr', name: 'High-Res Optical Camera', mass: 15.0, cost: 12.0, power_consumption: 20.0, utility_score: 85.0 },
  { id: 'spec-ir', name: 'Infrared Spectrometer', mass: 25.0, cost: 22.0, power_consumption: 35.0, utility_score: 90.0 },
  { id: 'radar-sar', name: 'SAR Radar', mass: 45.0, cost: 40.0, power_consumption: 60.0, utility_score: 95.0 },
  { id: 'mag', name: 'Fluxgate Magnetometer', mass: 5.0, cost: 8.0, power_consumption: 5.0, utility_score: 70.0 },
];

export const OBJECTIVE_SUGGESTIONS = [
  'Map the surface in high resolution',
  'Measure mineral composition',
  'Monitor climate and vegetation',
  'Characterise the magnetic field',
  'Search for water ice',
  'Demonstrate new technology in orbit',
];

export const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;

export const DEFAULT_DRAFT: MissionDraft = {
  name: '',
  objectives: [],
  destinationId: 'leo',
  duration_days: 30,
  difficulty: 'Intermediate',
  budget_allocated: 200,
  altitude_km: 400,
  inclination_deg: 28.5,
  spacecraftId: null,
  fuel_mass: 0,
  launcherId: null,
  instrumentIds: [],
};
