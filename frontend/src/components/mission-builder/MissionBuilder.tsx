"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ClipboardList, Cpu, Microscope, RotateCcw, Rocket, Target } from 'lucide-react';
import { ApiHttpError, missionApi } from '@/lib/mission/api';
import { DEFAULT_DRAFT, FALLBACK_INSTRUMENTS, FALLBACK_LAUNCHERS, SPACECRAFT_BUSES } from '@/lib/mission/catalog';
import { changedDraftKeys, clearIssuesForDraftChange, readinessSummary, reviewBadgeState, toBuilderIssues, type BackendError } from '@/lib/mission/errors';
import type { BuilderStep, Instrument, Launcher, MissionDraft, SimulationResult } from '@/lib/mission/types';
import { buildMissionRequest, computeConstraints, estimateLocally, validateMission } from '@/lib/mission/validation';
import ConstraintsPanel from './ConstraintsPanel';
import MissionStep from './steps/MissionStep';
import SpacecraftStep from './steps/SpacecraftStep';
import LauncherStep from './steps/LauncherStep';
import PayloadStep from './steps/PayloadStep';
import ReviewStep, { type ResultSource } from './steps/ReviewStep';
import { fmt } from './ui';

const STEPS: { id: BuilderStep; label: string; icon: React.ElementType }[] = [
  { id: 'mission', label: 'Mission', icon: Target },
  { id: 'spacecraft', label: 'Plateforme', icon: Cpu },
  { id: 'launcher', label: 'Lanceur', icon: Rocket },
  { id: 'payload', label: 'Charge utile', icon: Microscope },
  { id: 'review', label: 'Revue et lancement', icon: ClipboardList },
];

/** Tooltip of the step badges; the two backend states are distinct from a local validation result. */
const BADGE_TITLE: Record<'idle' | 'ok' | 'error' | 'refused' | 'failed', string | undefined> = {
  idle: undefined,
  ok: undefined,
  error: undefined,
  refused: 'Validée localement, mais refusée par le backend',
  failed: "Validée localement, mais la simulation n'a pas abouti côté backend",
};

/** Constraint issues are shown as soon as they appear, without waiting for a touch. */
const ALWAYS_VISIBLE = new Set(['mass', 'power', 'budget']);
const STORAGE_KEY = 'nova.missionBuilder.draft.v1';

type ApiStatus = 'checking' | 'online' | 'offline';

export default function MissionBuilder({ onLaunched }: { onLaunched?: (result: SimulationResult, missionName: string) => void }) {
  const [draft, setDraft] = useState<MissionDraft>(DEFAULT_DRAFT);
  const [step, setStep] = useState<BuilderStep>('mission');
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [attempted, setAttempted] = useState<Set<BuilderStep>>(new Set());

  const [launchers, setLaunchers] = useState<Launcher[]>(FALLBACK_LAUNCHERS);
  const [instrumentCatalog, setInstrumentCatalog] = useState<Instrument[]>(FALLBACK_INSTRUMENTS);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');

  const [launching, setLaunching] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [resultSource, setResultSource] = useState<ResultSource | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  /** Analysed refusal from the backend (HTTP error or malformed answer) for the last launch. */
  const [backendError, setBackendError] = useState<BackendError | null>(null);
  /**
   * True once the saved draft has been read. Until then the draft is still DEFAULT_DRAFT and must
   * not be saved: on mount (and twice under React Strict Mode) saving first would overwrite the
   * stored draft before it is restored. A state, not a ref, so the save effect of the first render
   * still sees `false` even though both effects run in the same commit.
   */
  const [restored, setRestored] = useState(false);

  // Restore a saved draft (per-browser convenience only).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setDraft({ ...DEFAULT_DRAFT, ...JSON.parse(saved) });
    } catch {
      /* storage unavailable or corrupted: start from defaults */
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft, restored]);

  // Load catalogs from the backend; keep local fallbacks if it is offline.
  useEffect(() => {
    let cancelled = false;
    Promise.all([missionApi.getLaunchers(), missionApi.getInstruments()])
      .then(([l, i]) => {
        if (cancelled) return;
        if (Array.isArray(l) && l.length) setLaunchers(l);
        if (Array.isArray(i) && i.length) setInstrumentCatalog(i);
        setApiStatus('online');
      })
      .catch(() => { if (!cancelled) setApiStatus('offline'); });
    return () => { cancelled = true; };
  }, []);

  const spacecraft = SPACECRAFT_BUSES.find(s => s.id === draft.spacecraftId) ?? null;
  const launcher = launchers.find(l => l.id === draft.launcherId) ?? null;
  const instruments = useMemo(
    () => draft.instrumentIds.map(id => instrumentCatalog.find(i => i.id === id)).filter((i): i is Instrument => !!i),
    [draft.instrumentIds, instrumentCatalog],
  );

  const ctx = useMemo(() => ({ draft, spacecraft, launcher, instruments }), [draft, spacecraft, launcher, instruments]);
  const constraints = useMemo(() => computeConstraints(ctx), [ctx]);
  const issues = useMemo(() => validateMission(ctx, constraints), [ctx, constraints]);
  // Fields refused by the backend, shown next to the matching inputs until that value changes or the mission is relaunched.
  const backendIssues = useMemo(() => toBuilderIssues(backendError), [backendError]);

  // Latest draft, read by update() to tell a real change from re-selecting the same value.
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const update = useCallback((patch: Partial<MissionDraft>) => {
    const changedKeys = changedDraftKeys(draftRef.current, patch);
    setDraft(d => ({ ...d, ...patch }));
    // Any change invalidates a previous simulation result.
    setResult(null);
    setResultSource(null);
    setLaunchError(null);
    // Only the backend issues tied to values that really changed become obsolete; the others stay visible.
    setBackendError(e => clearIssuesForDraftChange(e, changedKeys));
  }, []);

  const touch = useCallback((field: string) => {
    setTouched(t => (t.has(field) ? t : new Set(t).add(field)));
  }, []);

  const issuesFor = useCallback(
    (field: string) => [
      ...issues.filter(i => i.field === field && (ALWAYS_VISIBLE.has(field) || touched.has(field) || attempted.has(i.step) || step === 'review')),
      ...backendIssues.filter(i => i.field === field),
    ],
    [issues, backendIssues, touched, attempted, step],
  );

  const stepIndex = STEPS.findIndex(s => s.id === step);
  const goToStep = (s: BuilderStep) => {
    setAttempted(a => new Set(a).add(step));
    setStep(s);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const stepState = (s: BuilderStep) => {
    const errs = [...issues, ...backendIssues].filter(i => i.step === s && i.severity === 'error').length;
    const seen = attempted.has(s) || s === step;
    if (s === 'review') return reviewBadgeState(issues.some(i => i.severity === 'error'), backendError);
    if (!seen) return 'idle';
    return errs > 0 ? 'error' : 'ok';
  };

  const launch = async () => {
    setAttempted(new Set(STEPS.map(s => s.id)));
    if (issues.some(i => i.severity === 'error')) return;
    const payload = buildMissionRequest(ctx);
    if (!payload) return;

    setLaunching(true);
    setLaunchError(null);
    setBackendError(null);
    try {
      const res = await missionApi.simulate(payload);
      setResult(res);
      setResultSource('backend');
      setApiStatus('online');
      onLaunched?.(res, payload.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      if (err instanceof ApiHttpError) {
        // The backend is up but refused the configuration: show its feedback, no fake result.
        // The draft is left untouched so the user can correct it.
        setResult(null);
        setResultSource(null);
        setLaunchError(message);
        setBackendError(err.info);
      } else {
        const estimate = estimateLocally(payload, constraints);
        setApiStatus('offline');
        setResult(estimate);
        setResultSource('local');
        setLaunchError(message);
        onLaunched?.(estimate, payload.name);
      }
    } finally {
      setLaunching(false);
    }
  };

  const reset = () => {
    if (typeof window !== 'undefined' && !window.confirm('Réinitialiser toute la configuration de la mission ?')) return;
    setDraft(DEFAULT_DRAFT);
    setTouched(new Set());
    setAttempted(new Set());
    setResult(null);
    setResultSource(null);
    setLaunchError(null);
    setBackendError(null);
    setStep('mission');
  };

  const stepProps = { draft, update, issuesFor, touch };
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const readiness = readinessSummary(errorCount, backendError);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">Conception de mission</h2>
          <p className="mt-2 text-lg text-slate-300">Concevez et configurez votre mission spatiale avant la simulation.</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border ${
              apiStatus === 'online' ? 'bg-green-950/40 border-green-700 text-green-300'
              : apiStatus === 'offline' ? 'bg-amber-950/30 border-amber-800/60 text-amber-300'
              : 'bg-nova-panel/70 border-nova-line text-slate-400'
            }`}
            title={apiStatus === 'offline' ? 'Catalogue local et estimations hors ligne' : undefined}
          >
            API {apiStatus === 'online' ? 'EN LIGNE' : apiStatus === 'offline' ? 'HORS LIGNE · mode local' : 'VÉRIFICATION…'}
          </span>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-nova-line bg-nova-bg/40 text-xs text-slate-300 hover:text-white hover:border-nova-sky/50 hover:bg-nova-blue/10 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Réinitialiser
          </button>
        </div>
      </div>

      {/* Stepper */}
      <nav aria-label="Étapes de conception de la mission" className="-mx-1 overflow-x-auto">
        <ol className="flex min-w-max sm:min-w-0 sm:flex-wrap gap-1 px-1">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const state = stepState(s.id);
            const active = s.id === step;
            return (
              <li key={s.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => goToStep(s.id)}
                  aria-current={active ? 'step' : undefined}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    active
                      ? 'border-nova-sky/60 bg-nova-blue/10 text-nova-sky shadow-[0_0_18px_-6px_rgba(43,140,255,0.7)]'
                      : 'border-nova-line/70 bg-nova-panel/60 text-slate-300 hover:text-white hover:border-nova-sky/40'
                  }`}
                >
                  <span
                    title={BADGE_TITLE[state]}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-display font-semibold ${
                      state === 'refused' ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/70'
                      : state === 'failed' ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/70'
                      : state === 'error' ? 'bg-rose-500/20 text-rose-300'
                      : state === 'ok' && !active ? 'bg-green-500/20 text-green-300'
                      : active ? 'bg-nova-blue/25 text-nova-sky' : 'bg-nova-line/60 text-slate-300'
                    }`}
                  >
                    {state === 'refused' || state === 'failed'
                      ? <span aria-label={BADGE_TITLE[state]}>!</span>
                      : state === 'ok' && !active ? <Check className="h-3.5 w-3.5" aria-label="terminée" /> : state === 'error' ? '!' : idx + 1}
                  </span>
                  <Icon className="h-4 w-4 shrink-0 hidden md:block" aria-hidden />
                  <span className="whitespace-nowrap">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Compact constraints bar (mobile/tablet) */}
      <div className="lg:hidden grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Masse', b: constraints.mass, unit: 'kg', show: !!(spacecraft && launcher) },
          { label: 'Énergie', b: constraints.power, unit: 'W', show: !!spacecraft },
          { label: 'Budget', b: constraints.budget, unit: 'M$', show: draft.budget_allocated > 0 },
        ].map(({ label, b, unit, show }) => (
          <div key={label} className="bg-nova-panel/70 border border-nova-line/80 rounded-xl px-2 py-2 backdrop-blur-md">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
            <p className={`text-xs font-mono font-semibold ${!show ? 'text-slate-500' : b.ok ? (b.ratio > 0.9 ? 'text-amber-400' : 'text-green-400') : 'text-rose-400'}`}>
              {show ? `${Math.round(b.ratio * 100)}%` : '—'}
            </p>
            <p className="text-[10px] text-slate-500 font-mono truncate">{show ? `${fmt(b.used, 0)}/${fmt(b.limit, 0)} ${unit}` : 'en attente'}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="min-w-0">
          {step === 'mission' && <MissionStep {...stepProps} />}
          {step === 'spacecraft' && <SpacecraftStep {...stepProps} />}
          {step === 'launcher' && <LauncherStep {...stepProps} launchers={launchers} spacecraftMass={spacecraft ? constraints.mass.used : 0} />}
          {step === 'payload' && <PayloadStep {...stepProps} instruments={instrumentCatalog} spacecraft={spacecraft} />}
          {step === 'review' && (
            <ReviewStep
              ctx={ctx}
              constraints={constraints}
              issues={issues}
              goToStep={goToStep}
              onLaunch={launch}
              launching={launching}
              result={result}
              resultSource={resultSource}
              launchError={launchError}
              backendError={backendError}
            />
          )}

          {/* Prev / next */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={stepIndex === 0}
              onClick={() => goToStep(STEPS[stepIndex - 1].id)}
              className="nova-btn-outline gap-1 px-4 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden /> Retour
            </button>
            {stepIndex < STEPS.length - 1 && (
              <button
                type="button"
                onClick={() => goToStep(STEPS[stepIndex + 1].id)}
                className="nova-btn-primary gap-1 px-4 py-2 text-sm"
              >
                Suivant : {STEPS[stepIndex + 1].label} <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 space-y-4">
          <ConstraintsPanel
            constraints={constraints}
            hasSpacecraft={!!spacecraft}
            hasLauncher={!!launcher}
            budgetSet={Number.isFinite(draft.budget_allocated) && draft.budget_allocated > 0}
          />
          <div className="nova-card p-4 text-xs">
            <p className="text-slate-400 uppercase tracking-wider font-semibold">Préparation</p>
            <p className={`mt-1 text-sm font-display font-semibold ${readiness.state === 'ready' ? 'text-green-400' : readiness.state === 'failed' ? 'text-amber-400' : 'text-rose-400'}`}>
              {readiness.label}
            </p>
            {readiness.state !== 'ready' && step !== 'review' && (
              <button type="button" onClick={() => goToStep('review')} className="relative mt-2 text-nova-sky underline underline-offset-2 hover:text-white">
                Voir tous les problèmes
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
