"use client";
import React from 'react';
import { Microscope } from 'lucide-react';
import type { Instrument, SpacecraftBus } from '@/lib/mission/types';
import { IssueList, Panel, SelectableCard, Stat, fmt } from '../ui';
import type { StepProps } from './MissionStep';

export default function PayloadStep({ draft, update, issuesFor, touch, instruments, spacecraft }: StepProps & {
  instruments: Instrument[];
  spacecraft: SpacecraftBus | null;
}) {
  const slots = spacecraft?.max_instruments ?? Infinity;
  const full = draft.instrumentIds.length >= slots;

  const toggle = (id: string) => {
    touch('instruments');
    const selected = draft.instrumentIds.includes(id);
    update({ instrumentIds: selected ? draft.instrumentIds.filter(x => x !== id) : [...draft.instrumentIds, id] });
  };

  return (
    <Panel
      title="Payload & scientific instruments"
      subtitle={spacecraft
        ? `${draft.instrumentIds.length} of ${spacecraft.max_instruments} slots used on the ${spacecraft.name}.`
        : 'Select a spacecraft first to know how many instrument slots are available.'}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Instruments">
        {instruments.map(inst => {
          const selected = draft.instrumentIds.includes(inst.id);
          return (
            <SelectableCard
              key={inst.id}
              role="checkbox"
              selected={selected}
              disabled={!selected && full}
              onClick={() => toggle(inst.id)}
            >
              <div className="flex items-center gap-2 pr-6">
                <Microscope className="h-5 w-5 text-cyan-400 shrink-0" aria-hidden />
                <p className="font-semibold text-slate-100">{inst.name}</p>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                <Stat label="Mass" value={`${fmt(inst.mass)} kg`} />
                <Stat label="Power" value={`${fmt(inst.power_consumption)} W`} />
                <Stat label="Cost" value={`$${fmt(inst.cost)}M`} />
                <Stat label="Science" value={fmt(inst.utility_score, 0)} tone="good" />
              </div>
            </SelectableCard>
          );
        })}
      </div>
      {full && Number.isFinite(slots) && (
        <p className="text-xs text-slate-400 mt-3">All instrument slots are used — deselect one to choose another.</p>
      )}
      <IssueList issues={[...issuesFor('instruments'), ...issuesFor('power')]} />
    </Panel>
  );
}
