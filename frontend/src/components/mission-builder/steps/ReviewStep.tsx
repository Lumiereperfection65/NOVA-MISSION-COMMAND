"use client";
import React from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Rocket, WifiOff, XCircle } from 'lucide-react';
import { DESTINATIONS } from '@/lib/mission/catalog';
import type { BuilderStep, MissionConstraints, SimulationResult, ValidationIssue } from '@/lib/mission/types';
import type { MissionContext } from '@/lib/mission/validation';
import { Panel, Stat, fmt } from '../ui';

export type ResultSource = 'backend' | 'local';

const STEP_LABEL: Record<BuilderStep, string> = {
  mission: 'Mission', spacecraft: 'Spacecraft', launcher: 'Launcher', payload: 'Payload', review: 'Review',
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-0.5 sm:gap-4 py-2 border-b border-slate-800/70 last:border-0">
      <dt className="text-xs text-slate-500 uppercase tracking-wider sm:pt-0.5">{label}</dt>
      <dd className="text-sm text-slate-200 sm:text-right break-words">{children}</dd>
    </div>
  );
}

export default function ReviewStep({ ctx, constraints, issues, goToStep, onLaunch, launching, result, resultSource, launchError }: {
  ctx: MissionContext;
  constraints: MissionConstraints;
  issues: ValidationIssue[];
  goToStep: (s: BuilderStep) => void;
  onLaunch: () => void;
  launching: boolean;
  result: SimulationResult | null;
  resultSource: ResultSource | null;
  launchError: string | null;
}) {
  const { draft, spacecraft, launcher, instruments } = ctx;
  const destination = DESTINATIONS.find(d => d.id === draft.destinationId);
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const ready = errors.length === 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Mission summary">
          <dl>
            <Row label="Name">{draft.name.trim() || <span className="text-rose-400">Not set</span>}</Row>
            <Row label="Destination">{destination?.name ?? '—'}</Row>
            <Row label="Duration">{fmt(draft.duration_days, 0)} days</Row>
            <Row label="Difficulty">{draft.difficulty}</Row>
            <Row label="Orbit">{fmt(draft.altitude_km, 0)} km · {fmt(draft.inclination_deg)}°</Row>
            <Row label="Budget">${fmt(draft.budget_allocated)}M</Row>
            <Row label="Objectives">
              {draft.objectives.length ? (
                <ol className="list-decimal list-inside sm:list-outside sm:pl-4 space-y-0.5 text-left">
                  {draft.objectives.map(o => <li key={o}>{o}</li>)}
                </ol>
              ) : <span className="text-rose-400">None</span>}
            </Row>
          </dl>
        </Panel>

        <Panel title="Hardware">
          <dl>
            <Row label="Spacecraft">
              {spacecraft ? `${spacecraft.name} (${fmt(spacecraft.base_mass)} kg dry)` : <span className="text-rose-400">Not selected</span>}
            </Row>
            <Row label="Propellant">{spacecraft ? `${fmt(draft.fuel_mass)} kg` : '—'}</Row>
            <Row label="Launcher">
              {launcher ? `${launcher.name} (${fmt(launcher.payload_capacity, 0)} kg capacity)` : <span className="text-rose-400">Not selected</span>}
            </Row>
            <Row label="Instruments">
              {instruments.length ? (
                <ul className="space-y-0.5">{instruments.map(i => <li key={i.id}>{i.name}</li>)}</ul>
              ) : <span className="text-rose-400">None</span>}
            </Row>
          </dl>
          <div className="mt-4 grid grid-cols-3 gap-3 bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <Stat label="Total mass" value={`${fmt(constraints.mass.used)} kg`} tone={launcher && spacecraft ? (constraints.mass.ok ? 'good' : 'bad') : 'default'} />
            <Stat label="Power bal." value={`${fmt(constraints.power.margin)} W`} tone={spacecraft ? (constraints.power.ok ? 'good' : 'bad') : 'default'} />
            <Stat label="Total cost" value={`$${fmt(constraints.budget.used)}M`} tone={constraints.budget.ok ? 'good' : 'bad'} />
          </div>
        </Panel>
      </div>

      <Panel title="Pre-launch check">
        {issues.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="h-5 w-5" aria-hidden /> All systems go. The configuration is valid.
          </p>
        ) : (
          <ul className="space-y-2" role="list">
            {[...errors, ...warnings].map((issue, idx) => (
              <li
                key={`${issue.field}-${idx}`}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${issue.severity === 'error' ? 'border-rose-900/60 bg-rose-950/30 text-rose-300' : 'border-amber-900/60 bg-amber-950/20 text-amber-300'}`}
              >
                {issue.severity === 'error'
                  ? <XCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
                  : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />}
                <span className="flex-1">{issue.message}</span>
                {issue.step !== 'review' && (
                  <button type="button" onClick={() => goToStep(issue.step)} className="shrink-0 text-xs underline underline-offset-2 hover:text-white">
                    Fix in {STEP_LABEL[issue.step]}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            onClick={onLaunch}
            disabled={!ready || launching}
            className="inline-flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-bold px-6 py-3 rounded-lg transition-colors"
          >
            {launching ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Rocket className="h-5 w-5" aria-hidden />}
            {launching ? 'Running simulation…' : 'Launch simulation'}
          </button>
          {!ready && (
            <p className="text-xs text-slate-400">
              Fix {errors.length} error{errors.length > 1 ? 's' : ''} to enable launch.
            </p>
          )}
        </div>
      </Panel>

      {(result || launchError) && (
        <Panel title="Simulation result">
          {resultSource === 'local' && (
            <p className="flex items-start gap-2 text-xs text-amber-300 bg-amber-950/20 border border-amber-900/50 rounded-lg px-3 py-2 mb-4">
              <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
              <span>Backend unavailable{launchError ? ` (${launchError})` : ''}. Showing an offline estimate computed with the same rules as the simulation engine.</span>
            </p>
          )}
          {result && (
            <div aria-live="polite">
              <div className="flex flex-wrap items-center gap-4">
                <span className={`px-3 py-1 rounded font-mono text-sm font-bold border ${result.mission_status === 'SUCCESS' ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300' : 'bg-rose-950/50 border-rose-700 text-rose-300'}`}>
                  {result.mission_status}
                </span>
                <span className="text-sm text-slate-400">Score <span className="font-mono text-2xl font-bold text-cyan-400 ml-1">{fmt(result.score)}</span></span>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <Stat label="Mass" value={`${fmt(result.total_mass_kg)} kg`} />
                <Stat label="Capacity" value={`${fmt(result.payload_capacity_kg, 0)} kg`} />
                <Stat label="Cost" value={`$${fmt(result.total_cost_m_usd)}M`} />
                <Stat label="Power bal." value={`${fmt(result.power_balance?.balance)} W`} tone={result.power_balance?.is_viable ? 'good' : 'bad'} />
                <Stat label="Period" value={`${fmt(result.orbit?.orbital_period_minutes)} min`} />
                <Stat label="Velocity" value={`${fmt(result.orbit?.orbital_velocity_kms, 2)} km/s`} />
              </div>
              {result.recommendations?.length > 0 && (
                <ul className="mt-4 list-disc pl-5 text-sm text-slate-300 space-y-1">
                  {result.recommendations.map(r => <li key={r}>{r}</li>)}
                </ul>
              )}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
