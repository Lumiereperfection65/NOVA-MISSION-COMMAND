"use client";
import React, { useState } from 'react';
import { BarChart3, Loader2, Play, Rocket, WifiOff } from 'lucide-react';
import { missionApi } from '@/lib/mission/api';
import type { MissionRequest, SimulationResult } from '@/lib/mission/types';

/** Reference mission used by the quick engine test (same payload as the original dashboard test). */
const QUICK_TEST: Omit<MissionRequest, 'name'> = {
  destination: 'Moon',
  duration_days: 30,
  difficulty: 'Intermediate',
  budget_allocated: 200.0,
  spacecraft: { base_mass: 200.0, fuel_mass: 400.0, solar_power_generation: 300.0, base_power_consumption: 60.0, cost: 50.0 },
  instruments: [
    { name: 'High-Res Optical Camera', mass: 15.0, cost: 12.0, power_consumption: 20.0, utility_score: 85.0 },
    { name: 'Infrared Spectrometer', mass: 25.0, cost: 22.0, power_consumption: 35.0, utility_score: 90.0 },
  ],
  launcher: { name: 'Nova-1 Light', payload_capacity: 1000.0, cost: 50.0 },
  orbit: { altitude_km: 100.0, inclination_deg: 45.0 },
};

const n = (v: number | null | undefined, d = 1) => (typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString('fr-FR', { maximumFractionDigits: d }) : '—');

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-nova-line/60 px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${tone === 'good' ? 'text-green-400' : tone === 'bad' ? 'text-rose-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

export function ResultView({ result, missionName }: { result: SimulationResult; missionName: string }) {
  const ok = result.mission_status === 'SUCCESS';
  const label = ok ? 'SUCCÈS' : result.mission_status === 'INVALID' ? 'CONFIGURATION INVALIDE' : 'ÉCHEC';
  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <span className={`rounded-lg border px-3 py-1 font-display text-sm font-bold ${ok ? 'border-green-600 bg-green-950/40 text-green-300' : 'border-rose-600 bg-rose-950/40 text-rose-300'}`}>
          {label}
        </span>
        <span className="text-lg font-semibold text-white">{missionName}</span>
        {result.risk_level && (
          <span className="rounded-lg border border-nova-line px-2.5 py-1 text-xs uppercase tracking-wider text-slate-300">Risque : {result.risk_level}</span>
        )}
        <span className="ml-auto text-slate-400">Score <span className="ml-1 font-display text-3xl font-bold text-nova-sky">{n(result.score)}</span></span>
      </div>
      <div className="mt-5 grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Metric label="Masse totale" value={`${n(result.total_mass_kg)} kg`} />
        <Metric label="Capacité lanceur" value={`${n(result.payload_capacity_kg, 0)} kg`} />
        <Metric label="Coût total" value={`${n(result.total_cost_m_usd)} M$`} />
        <Metric label="Bilan énergétique" value={`${n(result.power_balance?.balance)} W`} tone={result.power_balance?.is_viable ? 'good' : 'bad'} />
        <Metric label="Période orbitale" value={`${n(result.orbit?.orbital_period_minutes)} min`} />
        <Metric label="Vitesse orbitale" value={`${n(result.orbit?.orbital_velocity_kms, 2)} km/s`} />
      </div>
      {result.recommendations?.length > 0 && (
        <ul className="mt-4 list-disc pl-5 text-slate-300 space-y-1">
          {result.recommendations.map(r => <li key={r}>{r}</li>)}
        </ul>
      )}
    </div>
  );
}

export default function SimulationPage({ lastResult, lastMissionName, onOpenBuilder, onSimulated }: {
  lastResult: SimulationResult | null;
  lastMissionName: string;
  onOpenBuilder: () => void;
  onSimulated: (result: SimulationResult, name: string) => void;
}) {
  const [name, setName] = useState('Lunar Explorer Alpha');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runQuickTest = async () => {
    const missionName = name.trim();
    if (missionName.length < 3) {
      setError('Le nom de mission doit contenir au moins 3 caractères.');
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const res = await missionApi.simulate({ ...QUICK_TEST, name: missionName });
      onSimulated(res, missionName);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-8 py-8 sm:py-12 pb-28 lg:pb-12 space-y-6">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">Simulation</h1>
        <p className="mt-2 text-lg text-slate-300">Testez la faisabilité de vos missions avec le moteur de simulation.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
        <section className="nova-card p-6 sm:p-8">
          <h2 className="flex items-center gap-3 text-xl font-semibold text-white">
            <BarChart3 className="h-6 w-6 text-nova-sky" aria-hidden /> Dernier résultat
          </h2>
          <div className="mt-5">
            {lastResult ? (
              <ResultView result={lastResult} missionName={lastMissionName} />
            ) : (
              <div className="flex flex-col items-start gap-4">
                <p className="text-slate-300">Aucune simulation pour l&apos;instant. Configurez une mission complète pour lancer votre première simulation.</p>
                <button type="button" onClick={onOpenBuilder} className="nova-btn-primary">
                  <Rocket className="h-5 w-5" aria-hidden /> Configurer une mission
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="nova-card p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white">Test rapide du moteur</h2>
          <p className="mt-1 text-sm text-slate-400">Lance une mission lunaire de référence sur le backend.</p>
          <label htmlFor="quick-name" className="mt-5 block text-xs uppercase tracking-wider text-slate-400">Nom de la mission</label>
          <input
            id="quick-name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-nova-line bg-nova-bg/70 px-4 py-2.5 text-slate-100 focus:border-nova-sky focus:outline-none"
          />
          <button type="button" onClick={runQuickTest} disabled={running} className="nova-btn-primary mt-5 w-full disabled:opacity-60">
            {running ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}
            {running ? 'Simulation en cours…' : 'Lancer la simulation'}
          </button>
          {error && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
              <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {error}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
