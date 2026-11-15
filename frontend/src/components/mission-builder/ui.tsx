"use client";
import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { SimulationResult, ValidationIssue } from '@/lib/mission/types';

export function Panel({ title, subtitle, children, className = '' }: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`nova-card p-4 sm:p-6 ${className}`}>
      {title && <h3 className="font-display text-lg font-semibold text-white">{title}</h3>}
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      <div className={title || subtitle ? 'mt-4' : ''}>{children}</div>
    </div>
  );
}

export function Field({ id, label, hint, issues = [], children }: {
  id: string;
  label: string;
  hint?: string;
  issues?: ValidationIssue[];
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {hint && issues.length === 0 && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      <IssueList issues={issues} id={`${id}-issues`} />
    </div>
  );
}

export function IssueList({ issues, id }: { issues: ValidationIssue[]; id?: string }) {
  if (issues.length === 0) return null;
  return (
    <ul id={id} className="mt-1.5 space-y-1" role="alert">
      {issues.map((issue, idx) => (
        <li
          key={`${issue.field}-${idx}`}
          className={`flex items-start gap-1.5 text-xs ${issue.severity === 'error' ? 'text-rose-400' : 'text-amber-400'}`}
        >
          {issue.severity === 'error'
            ? <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
            : <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />}
          <span>{issue.message}</span>
        </li>
      ))}
    </ul>
  );
}

export function inputClass(hasError: boolean) {
  return `w-full bg-nova-bg/70 border rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-colors ${
    hasError
      ? 'border-rose-600 focus:border-rose-500 focus:ring-rose-500/40'
      : 'border-nova-line focus:border-nova-sky focus:ring-nova-sky/40'
  }`;
}

/** Clickable card used for spacecraft / launcher / instrument selection. */
export function SelectableCard({ selected, disabled, onClick, children, role = 'radio' }: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  role?: 'radio' | 'checkbox';
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={`relative text-left w-full rounded-xl border p-4 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-nova-sky ${
        selected
          ? 'border-nova-sky/70 bg-nova-blue/10 shadow-[0_0_0_1px_rgba(79,176,255,0.25)]'
          : 'border-nova-line/60 bg-white/[0.03] hover:border-nova-sky/40'
      } ${disabled ? 'opacity-40 cursor-not-allowed hover:border-nova-line/60' : ''}`}
    >
      {selected && <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-nova-sky" aria-hidden />}
      {children}
    </button>
  );
}

export function Stat({ label, value, tone = 'default' }: {
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'good' | 'bad' | 'warn';
}) {
  const color = { default: 'text-white', good: 'text-green-400', bad: 'text-rose-400', warn: 'text-amber-400' }[tone];
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-display font-semibold ${color} truncate`}>{value}</p>
    </div>
  );
}

export const fmt = (n: number | null | undefined, digits = 1) =>
  typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('fr-FR', { maximumFractionDigits: digits }) : '—';

/** French display of the engine status; the raw value is unchanged. */
const STATUS_LABEL: Record<SimulationResult['mission_status'], string> = {
  SUCCESS: 'SUCCÈS', FAILED: 'ÉCHEC', INVALID: 'CONFIGURATION INVALIDE',
};

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-nova-line/60 px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${tone === 'good' ? 'text-green-400' : tone === 'bad' ? 'text-rose-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

/**
 * Single view of a simulation result, used by the Builder review step and the Simulation page.
 * `missionName` is optional: the review step already shows it in the mission summary.
 */
export function ResultView({ result, missionName }: { result: SimulationResult; missionName?: string }) {
  const ok = result.mission_status === 'SUCCESS';
  const label = STATUS_LABEL[result.mission_status] ?? result.mission_status;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <span className={`rounded-lg border px-3 py-1 font-display text-sm font-bold ${ok ? 'border-green-600 bg-green-950/40 text-green-300' : 'border-rose-600 bg-rose-950/40 text-rose-300'}`}>
          {label}
        </span>
        {missionName && <span className="text-lg font-semibold text-white">{missionName}</span>}
        {result.risk_level && (
          <span className="rounded-lg border border-nova-line px-2.5 py-1 text-xs uppercase tracking-wider text-slate-300">Risque : {result.risk_level}</span>
        )}
        <span className="ml-auto text-slate-400">Score <span className="ml-1 font-display text-3xl font-bold text-nova-sky">{fmt(result.score)}</span></span>
      </div>
      <div className="mt-5 grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Metric label="Masse totale" value={`${fmt(result.total_mass_kg)} kg`} />
        <Metric label="Capacité lanceur" value={`${fmt(result.payload_capacity_kg, 0)} kg`} />
        <Metric label="Coût total" value={`${fmt(result.total_cost_m_usd)} M$`} />
        <Metric label="Bilan énergétique" value={`${fmt(result.power_balance?.balance)} W`} tone={result.power_balance?.is_viable ? 'good' : 'bad'} />
        <Metric label="Période orbitale" value={`${fmt(result.orbit?.orbital_period_minutes)} min`} />
        <Metric label="Vitesse orbitale" value={`${fmt(result.orbit?.orbital_velocity_kms, 2)} km/s`} />
      </div>
      {result.warnings && result.warnings.length > 0 && (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Avertissements du moteur</p>
          <ul className="mt-1.5 space-y-1">
            {result.warnings.map(w => (
              <li key={w} className="flex items-start gap-2 text-sm text-amber-300">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {result.recommendations?.length > 0 && (
        <ul className="mt-4 list-disc pl-5 text-slate-300 space-y-1">
          {result.recommendations.map(r => <li key={r}>{r}</li>)}
        </ul>
      )}
    </div>
  );
}
