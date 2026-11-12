"use client";
import React from 'react';
import { Rocket } from 'lucide-react';
import type { Launcher } from '@/lib/mission/types';
import { IssueList, Panel, SelectableCard, Stat, fmt } from '../ui';
import type { StepProps } from './MissionStep';

export default function LauncherStep({ draft, update, issuesFor, touch, launchers, spacecraftMass }: StepProps & {
  launchers: Launcher[];
  /** Current total spacecraft mass (bus + propellant + instruments), in kg. */
  spacecraftMass: number;
}) {
  return (
    <Panel
      title="Launch vehicle"
      subtitle={spacecraftMass > 0
        ? `Your spacecraft currently weighs ${fmt(spacecraftMass)} kg. Pick a launcher with enough payload capacity.`
        : 'Pick the rocket that will deliver your spacecraft to orbit.'}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" role="radiogroup" aria-label="Launcher">
        {launchers.map(l => {
          const fits = spacecraftMass <= l.payload_capacity;
          const usage = l.payload_capacity > 0 ? Math.min(100, (spacecraftMass / l.payload_capacity) * 100) : 0;
          return (
            <SelectableCard
              key={l.id}
              selected={l.id === draft.launcherId}
              onClick={() => { touch('launcher'); update({ launcherId: l.id }); }}
            >
              <div className="flex items-center gap-2 pr-6">
                <Rocket className="h-5 w-5 text-cyan-400 shrink-0" aria-hidden />
                <p className="font-semibold text-slate-100">{l.name}</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Stat label="Capacity" value={`${fmt(l.payload_capacity, 0)} kg`} />
                <Stat label="Cost" value={`$${fmt(l.cost)}M`} />
                <Stat label="Reliability" value={`${fmt(l.reliability * 100)}%`} tone={l.reliability >= 0.98 ? 'good' : 'default'} />
              </div>
              {spacecraftMass > 0 && (
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full ${fits ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${usage}%` }} />
                  </div>
                  <p className={`text-[11px] mt-1 font-mono ${fits ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {fits
                      ? `Fits — ${fmt(l.payload_capacity - spacecraftMass, 0)} kg spare`
                      : `Too heavy by ${fmt(spacecraftMass - l.payload_capacity, 0)} kg`}
                  </p>
                </div>
              )}
            </SelectableCard>
          );
        })}
      </div>
      <IssueList issues={[...issuesFor('launcher'), ...issuesFor('mass')]} />
    </Panel>
  );
}
