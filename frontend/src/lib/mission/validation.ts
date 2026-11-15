import { DESTINATIONS, DESTINATION_LABELS } from './catalog';
import type {
  ConstraintBudget,
  Instrument,
  Launcher,
  MissionConstraints,
  MissionDraft,
  MissionRequest,
  SimulationResult,
  SpacecraftBus,
  ValidationIssue,
} from './types';

export interface MissionContext {
  draft: MissionDraft;
  spacecraft: SpacecraftBus | null;
  launcher: Launcher | null;
  instruments: Instrument[];
}

/** Margin below which a constraint is flagged as a warning (10 %). */
export const LOW_MARGIN_RATIO = 0.9;

function budget(used: number, limit: number): ConstraintBudget {
  const ratio = limit > 0 ? used / limit : used > 0 ? Infinity : 0;
  return { used, limit, margin: limit - used, ratio, ok: used <= limit };
}

/**
 * Mass, energy and budget constraints.
 * Formulas mirror simulation/engine.py so the live gauges match the backend result.
 */
export function computeConstraints({ draft, spacecraft, launcher, instruments }: MissionContext): MissionConstraints {
  const busMass = spacecraft?.base_mass ?? 0;
  const fuelMass = spacecraft ? draft.fuel_mass : 0;
  const instrumentMass = instruments.reduce((s, i) => s + i.mass, 0);
  const busPower = spacecraft?.base_power_consumption ?? 0;
  const instrumentPower = instruments.reduce((s, i) => s + i.power_consumption, 0);
  const busCost = spacecraft?.cost ?? 0;
  const launcherCost = launcher?.cost ?? 0;
  const instrumentCost = instruments.reduce((s, i) => s + i.cost, 0);

  return {
    mass: budget(busMass + fuelMass + instrumentMass, launcher?.payload_capacity ?? 0),
    power: budget(busPower + instrumentPower, spacecraft?.solar_power_generation ?? 0),
    budget: budget(busCost + launcherCost + instrumentCost, draft.budget_allocated),
    breakdown: { busMass, fuelMass, instrumentMass, busPower, instrumentPower, busCost, launcherCost, instrumentCost },
  };
}

const fmt = (n: number, digits = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: digits });

export function validateMission(ctx: MissionContext, constraints: MissionConstraints): ValidationIssue[] {
  const { draft, spacecraft, launcher, instruments } = ctx;
  const issues: ValidationIssue[] = [];
  const add = (i: ValidationIssue) => issues.push(i);

  // --- Mission identity -----------------------------------------------------
  const name = draft.name.trim();
  if (!name) {
    add({ field: 'name', step: 'mission', severity: 'error', message: 'Donnez un nom à votre mission.' });
  } else if (name.length < 3) {
    add({ field: 'name', step: 'mission', severity: 'error', message: 'Le nom de la mission doit contenir au moins 3 caractères.' });
  } else if (name.length > 60) {
    add({ field: 'name', step: 'mission', severity: 'error', message: 'Le nom de la mission doit contenir au plus 60 caractères.' });
  } else if (/[<>{}[\]\\/|`~^$#@*=+;"]/.test(name)) {
    add({ field: 'name', step: 'mission', severity: 'error', message: 'Utilisez uniquement des lettres, des chiffres, des espaces et les caractères - _ \' . dans le nom.' });
  }

  if (draft.objectives.length === 0) {
    add({ field: 'objectives', step: 'mission', severity: 'error', message: 'Ajoutez au moins un objectif scientifique.' });
  }

  const destination = DESTINATIONS.find(d => d.id === draft.destinationId);
  if (!destination) {
    add({ field: 'destination', step: 'mission', severity: 'error', message: 'Choisissez une destination.' });
  }

  if (!Number.isFinite(draft.duration_days) || !Number.isInteger(draft.duration_days) || draft.duration_days < 1) {
    add({ field: 'duration_days', step: 'mission', severity: 'error', message: 'La durée doit être un nombre entier de jours, au minimum 1.' });
  } else if (draft.duration_days > 3650) {
    add({ field: 'duration_days', step: 'mission', severity: 'error', message: 'La durée ne peut pas dépasser 3 650 jours (10 ans).' });
  } else if (destination && draft.duration_days < destination.minDurationDays) {
    add({
      field: 'duration_days', step: 'mission', severity: 'warning',
      message: `Une mission vers la destination « ${DESTINATION_LABELS[destination.id] ?? destination.name} » nécessite généralement au moins ${destination.minDurationDays} jours (transit et opérations).`,
    });
  }

  if (!Number.isFinite(draft.budget_allocated) || draft.budget_allocated <= 0) {
    add({ field: 'budget_allocated', step: 'mission', severity: 'error', message: 'Le budget alloué doit être supérieur à 0 M$.' });
  } else if (draft.budget_allocated > 10000) {
    add({ field: 'budget_allocated', step: 'mission', severity: 'error', message: 'Le budget alloué ne peut pas dépasser 10 000 M$.' });
  }

  if (!Number.isFinite(draft.altitude_km) || draft.altitude_km < 50 || draft.altitude_km > 40000) {
    add({ field: 'altitude_km', step: 'mission', severity: 'error', message: "L'altitude de l'orbite doit être comprise entre 50 et 40 000 km." });
  } else if (draft.destinationId === 'leo' && draft.altitude_km < 160) {
    add({ field: 'altitude_km', step: 'mission', severity: 'warning', message: "Sous 160 km, la traînée atmosphérique fera rentrer l'engin spatial dans l'atmosphère en quelques jours." });
  }

  if (!Number.isFinite(draft.inclination_deg) || draft.inclination_deg < 0 || draft.inclination_deg > 180) {
    add({ field: 'inclination_deg', step: 'mission', severity: 'error', message: "L'inclinaison doit être comprise entre 0° et 180°." });
  }

  // --- Spacecraft -----------------------------------------------------------
  if (!spacecraft) {
    add({ field: 'spacecraft', step: 'spacecraft', severity: 'error', message: 'Sélectionnez une plateforme.' });
  } else {
    if (!Number.isFinite(draft.fuel_mass) || draft.fuel_mass < 0 || draft.fuel_mass > spacecraft.max_fuel_mass) {
      add({
        field: 'fuel_mass', step: 'spacecraft', severity: 'error',
        message: `La masse d'ergols doit être comprise entre 0 et ${fmt(spacecraft.max_fuel_mass)} kg pour la plateforme ${spacecraft.name}.`,
      });
    } else if (draft.fuel_mass === 0 && draft.destinationId !== 'leo') {
      add({ field: 'fuel_mass', step: 'spacecraft', severity: 'warning', message: "Aucun ergol chargé : l'engin spatial ne pourra pas manœuvrer pour atteindre sa destination." });
    }
  }

  // --- Launcher -------------------------------------------------------------
  if (!launcher) {
    add({ field: 'launcher', step: 'launcher', severity: 'error', message: 'Sélectionnez un lanceur.' });
  }

  // --- Payload --------------------------------------------------------------
  if (instruments.length === 0) {
    add({ field: 'instruments', step: 'payload', severity: 'error', message: 'Sélectionnez au moins un instrument scientifique.' });
  }
  if (spacecraft && instruments.length > spacecraft.max_instruments) {
    add({
      field: 'instruments', step: 'payload', severity: 'error',
      message: `La plateforme ${spacecraft.name} peut emporter au plus ${spacecraft.max_instruments} instruments (${instruments.length} sélectionnés).`,
    });
  }

  // --- Constraints ----------------------------------------------------------
  if (spacecraft && launcher) {
    const { mass } = constraints;
    if (!mass.ok) {
      add({
        field: 'mass', step: 'launcher', severity: 'error',
        message: `L'engin spatial dépasse de ${fmt(-mass.margin)} kg la capacité du lanceur ${launcher.name} (${fmt(mass.used)} / ${fmt(mass.limit)} kg). Choisissez un lanceur plus puissant, réduisez les ergols ou retirez des instruments.`,
      });
    } else if (mass.ratio > LOW_MARGIN_RATIO) {
      add({ field: 'mass', step: 'launcher', severity: 'warning', message: `La marge de masse n'est que de ${fmt(mass.margin)} kg (< 10 %).` });
    }
  }

  if (spacecraft) {
    const { power } = constraints;
    if (!power.ok) {
      add({
        field: 'power', step: 'payload', severity: 'error',
        message: `Déficit électrique de ${fmt(-power.margin)} W (${fmt(power.used)} W nécessaires, ${fmt(power.limit)} W produits). Retirez des instruments énergivores ou choisissez une plateforme plus puissante.`,
      });
    } else if (power.ratio > LOW_MARGIN_RATIO) {
      add({ field: 'power', step: 'payload', severity: 'warning', message: `La marge électrique n'est que de ${fmt(power.margin)} W (< 10 %).` });
    }
  }

  if (draft.budget_allocated > 0 && (spacecraft || launcher || instruments.length)) {
    const b = constraints.budget;
    if (!b.ok) {
      add({
        field: 'budget', step: 'review', severity: 'error',
        message: `La mission dépasse le budget de ${fmt(-b.margin)} M$ (${fmt(b.used)} / ${fmt(b.limit)} M$). Augmentez le budget ou choisissez des composants moins chers.`,
      });
    } else if (b.ratio > LOW_MARGIN_RATIO) {
      add({ field: 'budget', step: 'review', severity: 'warning', message: `La réserve budgétaire n'est que de ${fmt(b.margin)} M$ (< 10 %).` });
    }
  }

  return issues;
}

export function buildMissionRequest({ draft, spacecraft, launcher, instruments }: MissionContext): MissionRequest | null {
  if (!spacecraft || !launcher) return null;
  const destination = DESTINATIONS.find(d => d.id === draft.destinationId);
  return {
    name: draft.name.trim(),
    destination: destination?.name ?? draft.destinationId,
    duration_days: draft.duration_days,
    difficulty: draft.difficulty,
    budget_allocated: draft.budget_allocated,
    spacecraft: {
      name: spacecraft.name,
      base_mass: spacecraft.base_mass,
      fuel_mass: draft.fuel_mass,
      solar_power_generation: spacecraft.solar_power_generation,
      base_power_consumption: spacecraft.base_power_consumption,
      cost: spacecraft.cost,
    },
    instruments: instruments.map(({ id: _id, ...rest }) => rest),
    launcher: { name: launcher.name, payload_capacity: launcher.payload_capacity, cost: launcher.cost },
    orbit: { altitude_km: draft.altitude_km, inclination_deg: draft.inclination_deg },
  };
}

/**
 * Offline feasibility estimate used when the backend is unreachable.
 * Same rules as MissionSimulation.run_full_simulation in simulation/engine.py.
 */
export function estimateLocally(req: MissionRequest, c: MissionConstraints): SimulationResult {
  const success = c.mass.ok && c.power.ok && c.budget.ok;
  const balance = c.power.limit - c.power.used;
  let score = 25;
  if (success) {
    score = 50 + Math.min(50, req.instruments.length * 10) + (balance > 50 ? 15 : 0);
  }
  const mu = 398600.4418;
  const r = 6371 + req.orbit.altitude_km;
  const periodMin = (2 * Math.PI * Math.sqrt(r ** 3 / mu)) / 60;
  return {
    mission_status: success ? 'SUCCESS' : 'FAILED',
    score,
    total_mass_kg: c.mass.used,
    payload_capacity_kg: c.mass.limit,
    total_cost_m_usd: c.budget.used,
    budget_allocated_m_usd: c.budget.limit,
    power_balance: { generation: c.power.limit, consumption: c.power.used, balance, is_viable: c.power.ok },
    orbit: {
      altitude_km: req.orbit.altitude_km,
      inclination_deg: req.orbit.inclination_deg,
      orbital_period_minutes: Math.round(periodMin * 100) / 100,
      orbital_velocity_kms: Math.round(Math.sqrt(mu / r) * 1000) / 1000,
      radiation_exposure_level: req.orbit.altitude_km < 1000 ? 'Low' : 'Moderate',
    },
    recommendations: success
      ? []
      : ['Réduire la masse de la charge utile.', 'Optimiser la consommation électrique des instruments scientifiques.', 'Choisir un lanceur plus puissant ou augmenter le budget.'],
  };
}
