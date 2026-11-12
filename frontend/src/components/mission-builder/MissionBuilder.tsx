"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ClipboardList, Cpu, Microscope, RotateCcw, Rocket, Target } from 'lucide-react';
import { ApiHttpError, missionApi } from '@/lib/mission/api';
import { DEFAULT_DRAFT, FALLBACK_INSTRUMENTS, FALLBACK_LAUNCHERS, SPACECRAFT_BUSES } from '@/lib/mission/catalog';
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
  { id: 'spacecraft', label: 'Spacecraft', icon: Cpu },
  { id: 'launcher', label: 'Launcher', icon: Rocket },
  { id: 'payload', label: 'Payload', icon: Microscope },
  { id: 'review', label: 'Review & Launch', icon: ClipboardList },
];

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

  // Restore a saved draft (per-browser convenience only).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setDraft({ ...DEFAULT_DRAFT, ...JSON.parse(saved) });
    } catch {
      /* storage unavailable or corrupted: start from defaults */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft]);

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

  const update = useCallback((patch: Partial<MissionDraft>) => {
    setDraft(d => ({ ...d, ...patch }));
    // Any change invalidates a previous simulation result.
    setResult(null);
    setResultSource(null);
    setLaunchError(null);
  }, []);

  const touch = useCallback((field: string) => {
    setTouched(t => (t.has(field) ? t : new Set(t).add(field)));
  }, []);

  const issuesFor = useCallback(
    (field: string) =>
      issues.filter(i => i.field === field && (ALWAYS_VISIBLE.has(field) || touched.has(field) || attempted.has(i.step) || step === 'review')),
    [issues, touched, attempted, step],
  );

  const stepIndex = STEPS.findIndex(s => s.id === step);
  const goToStep = (s: BuilderStep) => {
    setAttempted(a => new Set(a).add(step));
    setStep(s);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const stepState = (s: BuilderStep) => {
    const errs = issues.filter(i => i.step === s && i.severity === 'error').length;
    const seen = attempted.has(s) || s === step;
    if (s === 'review') return issues.some(i => i.severity === 'error') ? 'idle' : 'ok';
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
    try {
      const res = await missionApi.simulate(payload);
      setResult(res);
      setResultSource('backend');
      setApiStatus('online');
      onLaunched?.(res, payload.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (err instanceof ApiHttpError) {
        // The backend is up but refused the configuration: show its feedback, no fake result.
        setResult(null);
        setResultSource(null);
        setLaunchError(message);
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
    if (typeof window !== 'undefined' && !window.confirm('Reset the whole mission configuration?')) return;
    setDraft(DEFAULT_DRAFT);
    setTouched(new Set());
    setAttempted(new Set());
    setResult(null);
    setResultSource(null);
    setLaunchError(null);
    setStep('mission');
  };

  const stepProps = { draft, update, issuesFor, touch };
  const errorCount = issues.filter(i => i.severity === 'error').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100">Mission Builder</h2>
          <p className="text-sm text-slate-400 mt-1">Design and configure your space mission before simulation.</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded text-[11px] font-mono border ${
              apiStatus === 'online' ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : apiStatus === 'offline' ? 'bg-amber-950/40 border-amber-800 text-amber-300'
              : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
            title={apiStatus === 'offline' ? 'Using local catalog and offline estimates' : undefined}
          >
            API {apiStatus === 'online' ? 'ONLINE' : apiStatus === 'offline' ? 'OFFLINE · local mode' : 'CHECKING…'}
          </span>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
          </button>
        </div>
      </div>

      {/* Stepper */}
      <nav aria-label="Mission builder steps" className="-mx-1 overflow-x-auto">
        <ol className="flex min-w-max sm:min-w-0 gap-1 px-1">
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
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    active ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-mono ${
                      state === 'error' ? 'bg-rose-500/20 text-rose-300'
                      : state === 'ok' && !active ? 'bg-emerald-500/20 text-emerald-300'
                      : active ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {state === 'ok' && !active ? <Check className="h-3.5 w-3.5" aria-label="complete" /> : state === 'error' ? '!' : idx + 1}
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
          { label: 'Mass', b: constraints.mass, unit: 'kg', show: !!(spacecraft && launcher) },
          { label: 'Energy', b: constraints.power, unit: 'W', show: !!spacecraft },
          { label: 'Budget', b: constraints.budget, unit: '$M', show: draft.budget_allocated > 0 },
        ].map(({ label, b, unit, show }) => (
          <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
            <p className={`text-xs font-mono font-semibold ${!show ? 'text-slate-500' : b.ok ? (b.ratio > 0.9 ? 'text-amber-400' : 'text-emerald-400') : 'text-rose-400'}`}>
              {show ? `${Math.round(b.ratio * 100)}%` : '—'}
            </p>
            <p className="text-[10px] text-slate-500 font-mono truncate">{show ? `${fmt(b.used, 0)}/${fmt(b.limit, 0)} ${unit}` : 'pending'}</p>
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
            />
          )}

          {/* Prev / next */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={stepIndex === 0}
              onClick={() => goToStep(STEPS[stepIndex - 1].id)}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-800 text-sm text-slate-300 hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden /> Back
            </button>
            {stepIndex < STEPS.length - 1 && (
              <button
                type="button"
                onClick={() => goToStep(STEPS[stepIndex + 1].id)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-sm font-semibold text-slate-950 transition-colors"
              >
                Next: {STEPS[stepIndex + 1].label} <ChevronRight className="h-4 w-4" aria-hidden />
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
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs">
            <p className="text-slate-400 uppercase tracking-wider font-semibold">Readiness</p>
            <p className={`mt-1 text-sm font-mono ${errorCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {errorCount === 0 ? 'GO FOR LAUNCH' : `${errorCount} blocking issue${errorCount > 1 ? 's' : ''}`}
            </p>
            {errorCount > 0 && step !== 'review' && (
              <button type="button" onClick={() => goToStep('review')} className="mt-2 text-cyan-400 underline underline-offset-2 hover:text-cyan-300">
                See all issues
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
