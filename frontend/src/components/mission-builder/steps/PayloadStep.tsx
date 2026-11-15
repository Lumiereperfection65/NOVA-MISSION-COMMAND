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
      title="Charge utile et instruments scientifiques"
      subtitle={spacecraft
        ? `Emplacements utilisés : ${draft.instrumentIds.length} sur ${spacecraft.max_instruments} (${spacecraft.name}).`
        : "Sélectionnez d'abord une plateforme pour connaître le nombre d'emplacements disponibles."}
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
                <Microscope className="h-5 w-5 text-nova-sky shrink-0" aria-hidden />
                <p className="font-semibold text-slate-100">{inst.name}</p>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                <Stat label="Masse" value={`${fmt(inst.mass)} kg`} />
                <Stat label="Puissance" value={`${fmt(inst.power_consumption)} W`} />
                <Stat label="Coût" value={`${fmt(inst.cost)} M$`} />
                <Stat label="Science" value={fmt(inst.utility_score, 0)} tone="good" />
              </div>
            </SelectableCard>
          );
        })}
      </div>
      {full && Number.isFinite(slots) && (
        <p className="text-xs text-slate-400 mt-3">Tous les emplacements sont occupés : désélectionnez un instrument pour en choisir un autre.</p>
      )}
      <IssueList issues={[...issuesFor('instruments'), ...issuesFor('power')]} />
    </Panel>
  );
}
