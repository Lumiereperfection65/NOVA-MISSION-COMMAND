"use client";
import React from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Rocket, WifiOff, XCircle } from 'lucide-react';
import { DESTINATIONS, DESTINATION_LABELS, DIFFICULTY_LABELS } from '@/lib/mission/catalog';
import type { BuilderStep, MissionConstraints, SimulationResult, ValidationIssue } from '@/lib/mission/types';
import type { MissionContext } from '@/lib/mission/validation';
import type { BackendError } from '@/lib/mission/errors';
import { Panel, ResultView, Stat, fmt } from '../ui';

export type ResultSource = 'backend' | 'local';

const STEP_LABEL: Record<BuilderStep, string> = {
  mission: 'Mission', spacecraft: 'Plateforme', launcher: 'Lanceur', payload: 'Charge utile', review: 'Revue',
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-0.5 sm:gap-4 py-2 border-b border-nova-line/50 last:border-0">
      <dt className="text-xs text-slate-400 uppercase tracking-wider sm:pt-0.5">{label}</dt>
      <dd className="text-sm text-slate-100 sm:text-right break-words">{children}</dd>
    </div>
  );
}

/** Refusal or unusable answer from the backend: what is wrong, where to fix it, and the raw details. */
function BackendErrorView({ error, goToStep }: { error: BackendError; goToStep: (s: BuilderStep) => void }) {
  return (
    <div role="alert" className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
        <XCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold">{error.title}</p>
          <p className="mt-0.5 text-rose-200/90">{error.message}</p>
        </div>
      </div>

      {error.changedSinceRefusal > 0 && (
        <p className="text-xs text-amber-300">
          {error.changedSinceRefusal === 1
            ? '1 valeur refusée a été modifiée depuis : relancez la simulation pour la faire vérifier par le backend.'
            : `${error.changedSinceRefusal} valeurs refusées ont été modifiées depuis : relancez la simulation pour les faire vérifier par le backend.`}
        </p>
      )}

      {error.fieldIssues.length > 0 && (
        <ul className="space-y-2">
          {error.fieldIssues.map((issue, idx) => {
            const target = issue.step;
            return (
              <li
                key={`${issue.location}-${idx}`}
                className="flex flex-col sm:flex-row sm:items-start gap-2 rounded-lg border border-nova-line/60 bg-white/[0.03] px-3 py-2 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-100">{issue.label}</p>
                  <p className="text-rose-300">{issue.message}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{issue.hint}</p>
                </div>
                {target && target !== 'review' && (
                  <button
                    type="button"
                    onClick={() => goToStep(target)}
                    className="shrink-0 self-start inline-flex items-center py-3 -my-3 text-xs text-nova-sky underline underline-offset-2 hover:text-white"
                  >
                    Corriger : {STEP_LABEL[target]}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer list-item py-3 -my-3 text-nova-sky hover:text-white select-none">Détails techniques</summary>
        <ul className="mt-2 space-y-1 font-mono text-slate-400 break-all">
          {error.technical.map((line, idx) => <li key={`${idx}-${line}`}>{line}</li>)}
        </ul>
      </details>
    </div>
  );
}

export default function ReviewStep({ ctx, constraints, issues, goToStep, onLaunch, launching, result, resultSource, launchError, backendError }: {
  ctx: MissionContext;
  constraints: MissionConstraints;
  issues: ValidationIssue[];
  goToStep: (s: BuilderStep) => void;
  onLaunch: () => void;
  launching: boolean;
  result: SimulationResult | null;
  resultSource: ResultSource | null;
  launchError: string | null;
  backendError: BackendError | null;
}) {
  const { draft, spacecraft, launcher, instruments } = ctx;
  const destination = DESTINATIONS.find(d => d.id === draft.destinationId);
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const ready = errors.length === 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Récapitulatif de la mission">
          <dl>
            <Row label="Nom">{draft.name.trim() || <span className="text-rose-400">Non défini</span>}</Row>
            <Row label="Destination">{destination ? DESTINATION_LABELS[destination.id] ?? destination.name : '—'}</Row>
            <Row label="Durée">{fmt(draft.duration_days, 0)} jours</Row>
            <Row label="Difficulté">{DIFFICULTY_LABELS[draft.difficulty] ?? draft.difficulty}</Row>
            <Row label="Orbite">{fmt(draft.altitude_km, 0)} km · {fmt(draft.inclination_deg)}°</Row>
            <Row label="Budget">{fmt(draft.budget_allocated)} M$</Row>
            <Row label="Objectifs">
              {draft.objectives.length ? (
                <ol className="list-decimal list-inside sm:list-outside sm:pl-4 space-y-0.5 text-left">
                  {draft.objectives.map(o => <li key={o}>{o}</li>)}
                </ol>
              ) : <span className="text-rose-400">Aucun</span>}
            </Row>
          </dl>
        </Panel>

        <Panel title="Matériel">
          <dl>
            <Row label="Plateforme">
              {spacecraft ? `${spacecraft.name} (${fmt(spacecraft.base_mass)} kg à sec)` : <span className="text-rose-400">Non sélectionnée</span>}
            </Row>
            <Row label="Ergols">{spacecraft ? `${fmt(draft.fuel_mass)} kg` : '—'}</Row>
            <Row label="Lanceur">
              {launcher ? `${launcher.name} (capacité ${fmt(launcher.payload_capacity, 0)} kg)` : <span className="text-rose-400">Non sélectionné</span>}
            </Row>
            <Row label="Instruments">
              {instruments.length ? (
                <ul className="space-y-0.5">{instruments.map(i => <li key={i.id}>{i.name}</li>)}</ul>
              ) : <span className="text-rose-400">Aucun</span>}
            </Row>
          </dl>
          <div className="mt-4 grid grid-cols-3 gap-3 bg-white/[0.03] border border-nova-line/60 rounded-xl p-3 lg:hidden">
            <Stat label="Masse totale" value={`${fmt(constraints.mass.used)} kg`} tone={launcher && spacecraft ? (constraints.mass.ok ? 'good' : 'bad') : 'default'} />
            <Stat label="Bilan élec." value={`${fmt(constraints.power.margin)} W`} tone={spacecraft ? (constraints.power.ok ? 'good' : 'bad') : 'default'} />
            <Stat label="Coût total" value={`${fmt(constraints.budget.used)} M$`} tone={constraints.budget.ok ? 'good' : 'bad'} />
          </div>
        </Panel>
      </div>

      <Panel title="Vérification avant lancement">
        {issues.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle2 className="h-5 w-5" aria-hidden /> Tous les systèmes sont prêts. La configuration est valide.
          </p>
        ) : (
          <ul className="space-y-2" role="list">
            {[...errors, ...warnings].map((issue, idx) => (
              <li
                key={`${issue.field}-${idx}`}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${issue.severity === 'error' ? 'border-rose-800/60 bg-rose-950/30 text-rose-300' : 'border-amber-800/60 bg-amber-950/30 text-amber-300'}`}
              >
                {issue.severity === 'error'
                  ? <XCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
                  : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />}
                <span className="flex-1">{issue.message}</span>
                {issue.step !== 'review' && (
                  <button type="button" onClick={() => goToStep(issue.step)} className="shrink-0 text-xs underline underline-offset-2 hover:text-white">
                    Corriger : {STEP_LABEL[issue.step]}
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
            className="nova-btn-primary gap-2 px-6 py-3 font-bold disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:brightness-100"
          >
            {launching ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Rocket className="h-5 w-5" aria-hidden />}
            {launching ? 'Simulation en cours…' : 'Lancer la simulation'}
          </button>
          {!ready && (
            <p className="text-xs text-slate-400">
              Corrigez {errors.length} erreur{errors.length > 1 ? 's' : ''} pour activer le lancement.
            </p>
          )}
        </div>
      </Panel>

      {(result || launchError || backendError) && (
        <Panel title="Résultat de la simulation">
          {backendError && <BackendErrorView error={backendError} goToStep={goToStep} />}
          {resultSource === 'local' && (
            <p className="flex items-start gap-2 text-xs text-amber-300 bg-amber-950/30 border border-amber-800/60 rounded-lg px-3 py-2 mb-4">
              <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
              <span>Backend indisponible{launchError ? ` (${launchError})` : ''}. Affichage d&apos;une estimation hors ligne calculée avec les mêmes règles que le moteur de simulation.</span>
            </p>
          )}
          {result && (
            <div aria-live="polite">
              <ResultView result={result} />
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
