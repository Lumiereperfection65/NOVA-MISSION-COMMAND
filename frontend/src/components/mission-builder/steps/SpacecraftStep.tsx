"use client";
import React from 'react';
import { Satellite } from 'lucide-react';
import { SPACECRAFT_BUSES } from '@/lib/mission/catalog';
import { Field, IssueList, Panel, SelectableCard, Stat, fmt, inputClass } from '../ui';
import type { StepProps } from './MissionStep';

export default function SpacecraftStep({ draft, update, issuesFor, touch }: StepProps) {
  const selected = SPACECRAFT_BUSES.find(s => s.id === draft.spacecraftId) ?? null;
  const fuelErr = issuesFor('fuel_mass').some(i => i.severity === 'error');

  return (
    <div className="space-y-6">
      <Panel title="Spacecraft platform" subtitle="The bus provides structure, power and propulsion for your payload.">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" role="radiogroup" aria-label="Spacecraft">
          {SPACECRAFT_BUSES.map(sc => (
            <SelectableCard
              key={sc.id}
              selected={sc.id === draft.spacecraftId}
              onClick={() => {
                touch('spacecraft');
                update({ spacecraftId: sc.id, fuel_mass: sc.fuel_mass });
              }}
            >
              <div className="flex items-center gap-2 pr-6">
                <Satellite className="h-5 w-5 text-cyan-400 shrink-0" aria-hidden />
                <p className="font-semibold text-slate-100">{sc.name}</p>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 min-h-[2rem]">{sc.description}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Stat label="Dry mass" value={`${fmt(sc.base_mass)} kg`} />
                <Stat label="Cost" value={`$${fmt(sc.cost)}M`} />
                <Stat label="Power gen." value={`${fmt(sc.solar_power_generation)} W`} />
                <Stat label="Bus load" value={`${fmt(sc.base_power_consumption)} W`} />
                <Stat label="Max fuel" value={`${fmt(sc.max_fuel_mass)} kg`} />
                <Stat label="Instr. slots" value={sc.max_instruments} />
              </div>
            </SelectableCard>
          ))}
        </div>
        <IssueList issues={issuesFor('spacecraft')} />
      </Panel>

      {selected && (
        <Panel title="Propellant load" subtitle="More propellant enables more manoeuvres but adds launch mass.">
          <Field id="fuel" label={`Propellant mass (kg) — max ${fmt(selected.max_fuel_mass)}`} issues={issuesFor('fuel_mass')}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                type="range"
                aria-label="Propellant mass slider"
                min={0}
                max={selected.max_fuel_mass}
                step={selected.max_fuel_mass > 100 ? 10 : 1}
                value={Number.isFinite(draft.fuel_mass) ? Math.min(draft.fuel_mass, selected.max_fuel_mass) : 0}
                onChange={e => update({ fuel_mass: Number(e.target.value) })}
                className="flex-1 accent-cyan-500"
              />
              <input
                id="fuel"
                type="number"
                min={0}
                max={selected.max_fuel_mass}
                inputMode="decimal"
                value={Number.isFinite(draft.fuel_mass) ? draft.fuel_mass : ''}
                onChange={e => update({ fuel_mass: e.target.value.trim() === '' ? NaN : Number(e.target.value) })}
                onBlur={() => touch('fuel_mass')}
                aria-invalid={fuelErr}
                className={`${inputClass(fuelErr)} sm:w-32`}
              />
            </div>
          </Field>
        </Panel>
      )}
    </div>
  );
}
