"use client";
import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { DESTINATIONS, DIFFICULTIES, OBJECTIVE_SUGGESTIONS } from '@/lib/mission/catalog';
import type { Difficulty, MissionDraft, ValidationIssue } from '@/lib/mission/types';
import { Field, IssueList, Panel, inputClass } from '../ui';

const MAX_OBJECTIVES = 8;

export interface StepProps {
  draft: MissionDraft;
  update: (patch: Partial<MissionDraft>) => void;
  issuesFor: (field: string) => ValidationIssue[];
  touch: (field: string) => void;
}

/** Parse a numeric input; empty input becomes NaN so validation can flag it. */
const num = (v: string) => (v.trim() === '' ? NaN : Number(v));
const numValue = (n: number) => (Number.isFinite(n) ? n : '');

export default function MissionStep({ draft, update, issuesFor, touch }: StepProps) {
  const [objectiveInput, setObjectiveInput] = useState('');
  const [objectiveError, setObjectiveError] = useState<string | null>(null);
  const hasErr = (f: string) => issuesFor(f).some(i => i.severity === 'error');

  const addObjective = (raw: string) => {
    const text = raw.trim();
    touch('objectives');
    if (text.length < 3) return setObjectiveError('An objective must be at least 3 characters.');
    if (text.length > 120) return setObjectiveError('An objective must be 120 characters or fewer.');
    if (draft.objectives.some(o => o.toLowerCase() === text.toLowerCase())) return setObjectiveError('This objective is already listed.');
    if (draft.objectives.length >= MAX_OBJECTIVES) return setObjectiveError(`You can define up to ${MAX_OBJECTIVES} objectives.`);
    setObjectiveError(null);
    update({ objectives: [...draft.objectives, text] });
    setObjectiveInput('');
  };

  const selectDestination = (id: string) => {
    const dest = DESTINATIONS.find(d => d.id === id);
    if (!dest) return;
    update({
      destinationId: id,
      altitude_km: dest.defaultAltitudeKm,
      inclination_deg: id === 'geo' ? 0 : draft.inclination_deg,
      duration_days: Math.max(draft.duration_days, dest.minDurationDays),
    });
  };

  return (
    <div className="space-y-6">
      <Panel title="Mission identity" subtitle="Name your mission and define what it must achieve.">
        <div className="space-y-5">
          <Field id="mission-name" label="Mission name" hint="3–60 characters." issues={issuesFor('name')}>
            <input
              id="mission-name"
              type="text"
              value={draft.name}
              maxLength={80}
              placeholder="e.g. Lunar Explorer Alpha"
              onChange={e => update({ name: e.target.value })}
              onBlur={() => touch('name')}
              aria-invalid={hasErr('name')}
              className={inputClass(hasErr('name'))}
            />
          </Field>

          <div>
            <label htmlFor="objective-input" className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Scientific objectives <span className="normal-case text-slate-500">({draft.objectives.length}/{MAX_OBJECTIVES})</span>
            </label>
            <div className="flex gap-2">
              <input
                id="objective-input"
                type="text"
                value={objectiveInput}
                placeholder="Describe an objective and press Enter"
                onChange={e => { setObjectiveInput(e.target.value); setObjectiveError(null); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addObjective(objectiveInput); } }}
                className={inputClass(!!objectiveError || hasErr('objectives'))}
              />
              <button
                type="button"
                onClick={() => addObjective(objectiveInput)}
                className="shrink-0 inline-flex items-center gap-1 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-200 transition-colors"
              >
                <Plus className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Add</span>
              </button>
            </div>
            {objectiveError && <p className="text-xs text-rose-400 mt-1.5" role="alert">{objectiveError}</p>}
            <IssueList issues={issuesFor('objectives')} />

            {draft.objectives.length > 0 && (
              <ol className="mt-3 space-y-2">
                {draft.objectives.map((o, idx) => (
                  <li key={o} className="flex items-start gap-3 bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2">
                    <span className="text-xs font-mono text-cyan-400 mt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                    <span className="flex-1 text-sm text-slate-200 break-words">{o}</span>
                    <button
                      type="button"
                      aria-label={`Remove objective ${o}`}
                      onClick={() => update({ objectives: draft.objectives.filter(x => x !== o) })}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {OBJECTIVE_SUGGESTIONS.filter(s => !draft.objectives.includes(s)).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addObjective(s)}
                  className="text-xs px-2.5 py-1 rounded-full border border-slate-700 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Destination" subtitle="Where is the mission going?">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" role="radiogroup" aria-label="Destination">
          {DESTINATIONS.map(d => {
            const selected = d.id === draft.destinationId;
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => selectDestination(d.id)}
                className={`text-left rounded-lg border p-3 transition-colors ${selected ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'}`}
              >
                <p className={`text-sm font-semibold ${selected ? 'text-cyan-300' : 'text-slate-200'}`}>{d.name}</p>
                <p className="text-xs text-slate-500 mt-1">{d.description}</p>
              </button>
            );
          })}
        </div>
        <IssueList issues={issuesFor('destination')} />
      </Panel>

      <Panel title="Mission parameters">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field id="duration" label="Duration (days)" hint="1 – 3,650 days." issues={issuesFor('duration_days')}>
            <input
              id="duration" type="number" min={1} max={3650} step={1} inputMode="numeric"
              value={numValue(draft.duration_days)}
              onChange={e => update({ duration_days: num(e.target.value) })}
              onBlur={() => touch('duration_days')}
              aria-invalid={hasErr('duration_days')}
              className={inputClass(hasErr('duration_days'))}
            />
          </Field>

          <Field id="budget" label="Allocated budget (M USD)" hint="Total funding available for the mission." issues={issuesFor('budget_allocated')}>
            <input
              id="budget" type="number" min={1} max={10000} step={1} inputMode="decimal"
              value={numValue(draft.budget_allocated)}
              onChange={e => update({ budget_allocated: num(e.target.value) })}
              onBlur={() => touch('budget_allocated')}
              aria-invalid={hasErr('budget_allocated')}
              className={inputClass(hasErr('budget_allocated'))}
            />
          </Field>

          <Field id="altitude" label="Orbit altitude (km)" hint="Altitude of the operational orbit." issues={issuesFor('altitude_km')}>
            <input
              id="altitude" type="number" min={50} max={40000} step={10} inputMode="decimal"
              value={numValue(draft.altitude_km)}
              onChange={e => update({ altitude_km: num(e.target.value) })}
              onBlur={() => touch('altitude_km')}
              aria-invalid={hasErr('altitude_km')}
              className={inputClass(hasErr('altitude_km'))}
            />
          </Field>

          <Field id="inclination" label="Inclination (°)" hint="0° equatorial, 90° polar." issues={issuesFor('inclination_deg')}>
            <input
              id="inclination" type="number" min={0} max={180} step={0.5} inputMode="decimal"
              value={numValue(draft.inclination_deg)}
              onChange={e => update({ inclination_deg: num(e.target.value) })}
              onBlur={() => touch('inclination_deg')}
              aria-invalid={hasErr('inclination_deg')}
              className={inputClass(hasErr('inclination_deg'))}
            />
          </Field>

          <div className="sm:col-span-2">
            <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Difficulty</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Difficulty">
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={draft.difficulty === d}
                  onClick={() => update({ difficulty: d as Difficulty })}
                  className={`py-2 rounded-lg text-sm border transition-colors ${draft.difficulty === d ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 text-slate-400 hover:border-slate-600'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
