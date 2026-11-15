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
      title="Lanceur"
      subtitle={spacecraftMass > 0
        ? `Votre engin spatial pèse actuellement ${fmt(spacecraftMass)} kg. Choisissez un lanceur dont la capacité d'emport est suffisante.`
        : 'Choisissez la fusée qui placera votre engin spatial en orbite.'}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" role="radiogroup" aria-label="Lanceur">
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
                <Rocket className="h-5 w-5 text-nova-sky shrink-0" aria-hidden />
                <p className="font-semibold text-slate-100">{l.name}</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Stat label="Capacité" value={`${fmt(l.payload_capacity, 0)} kg`} />
                <Stat label="Coût" value={`${fmt(l.cost)} M$`} />
                <Stat label="Fiabilité" value={`${fmt(l.reliability * 100)} %`} tone={l.reliability >= 0.98 ? 'good' : 'default'} />
              </div>
              {spacecraftMass > 0 && (
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-nova-bg/80 overflow-hidden">
                    <div className={`h-full ${fits ? 'bg-green-500' : 'bg-rose-500'}`} style={{ width: `${usage}%` }} />
                  </div>
                  <p className={`text-[11px] mt-1 font-mono ${fits ? 'text-green-400' : 'text-rose-400'}`}>
                    {fits
                      ? `Compatible — ${fmt(l.payload_capacity - spacecraftMass, 0)} kg de marge`
                      : `Trop lourd de ${fmt(spacecraftMass - l.payload_capacity, 0)} kg`}
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
