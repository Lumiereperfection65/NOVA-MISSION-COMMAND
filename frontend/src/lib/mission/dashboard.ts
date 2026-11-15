import type { SimulationResult } from './types';

export type HealthLevel = 'nominal' | 'watch' | 'offline';

export interface ActiveMission {
  id: string;
  name: string;
  destination: string;
  phase: string;
  status: 'GO' | 'HOLD' | 'NO-GO';
  health: HealthLevel;
}

export const FLEET: ActiveMission[] = [
  { id: 'ares-1', name: 'Arès-1', destination: 'Lune', phase: 'Croisière', status: 'GO', health: 'nominal' },
  { id: 'nyanga-2', name: 'Nyanga-2', destination: 'LEO 400 km', phase: 'Opérations', status: 'GO', health: 'nominal' },
  { id: 'kongo-eye', name: 'Kongo Eye', destination: 'ISS', phase: 'Intégration', status: 'HOLD', health: 'watch' },
];

export function formatUtc(now: number | null) {
  if (now === null) return '—';
  return new Date(now).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

export function missionControlStatus(
  systemsOk: boolean | null,
  last: SimulationResult | null,
): { label: ActiveMission['status']; tone: 'good' | 'watch' | 'bad'; detail: string } {
  if (systemsOk === false) return { label: 'NO-GO', tone: 'bad', detail: 'Liaison backend perdue' };
  if (last?.mission_status === 'FAILED') return { label: 'NO-GO', tone: 'bad', detail: 'Dernière simulation échouée' };
  if (last?.mission_status === 'INVALID') return { label: 'HOLD', tone: 'watch', detail: 'Configuration à revoir' };
  if (systemsOk === null) return { label: 'HOLD', tone: 'watch', detail: 'Vérification des systèmes' };
  return { label: 'GO', tone: 'good', detail: 'Tous les systèmes nominaux' };
}

export function telemetryBaseline(last: SimulationResult | null) {
  return {
    altitude: last?.orbit?.altitude_km ?? 400,
    velocity: last?.orbit?.orbital_velocity_kms ?? 7.67,
    period: last?.orbit?.orbital_period_minutes ?? 92.4,
    powerGen: last?.power_balance?.generation ?? 300,
    powerUse: last?.power_balance?.consumption ?? 115,
    powerOk: last?.power_balance?.is_viable ?? true,
  };
}

/** Deterministic sparkline so SSR and first paint match. */
export function seedSeries(seed: number, length: number, center: number, amplitude: number) {
  return Array.from({ length }, (_, i) => {
    const t = i / Math.max(1, length - 1);
    const wobble = Math.sin((seed + i) * 0.73) * 0.55 + Math.cos((seed + i) * 1.17) * 0.45;
    return { t: i, v: Number((center + wobble * amplitude).toFixed(3)) };
  });
}
