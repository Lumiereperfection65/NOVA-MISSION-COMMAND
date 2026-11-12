"use client";
import React from 'react';
import { Weight, Zap, DollarSign } from 'lucide-react';
import type { ConstraintBudget, MissionConstraints } from '@/lib/mission/types';
import { LOW_MARGIN_RATIO } from '@/lib/mission/validation';
import { fmt } from './ui';

function Gauge({ icon: Icon, label, unit, budget, available, emptyHint, prefix = '' }: {
  icon: React.ElementType;
  label: string;
  unit: string;
  budget: ConstraintBudget;
  available: boolean;
  emptyHint: string;
  prefix?: string;
}) {
  const pct = Math.min(100, budget.ratio * 100);
  const state = !available ? 'idle' : !budget.ok ? 'over' : budget.ratio > LOW_MARGIN_RATIO ? 'tight' : 'ok';
  const bar = { idle: 'bg-slate-700', ok: 'bg-emerald-500', tight: 'bg-amber-500', over: 'bg-rose-500' }[state];
  const text = { idle: 'text-slate-500', ok: 'text-emerald-400', tight: 'text-amber-400', over: 'text-rose-400' }[state];
  const status = { idle: 'Pending', ok: 'Within limits', tight: 'Low margin', over: 'Exceeded' }[state];

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Icon className="h-4 w-4 text-cyan-400" aria-hidden />
          {label}
        </span>
        <span className={`text-[11px] font-mono uppercase ${text}`}>{status}</span>
      </div>
      <div
        className="mt-2 h-2.5 w-full rounded-full bg-slate-800 overflow-hidden"
        role="meter"
        aria-label={`${label} usage`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={available ? Math.round(budget.ratio * 100) : 0}
      >
        <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${available ? pct : 0}%` }} />
      </div>
      {available ? (
        <div className="mt-1.5 flex justify-between text-xs font-mono">
          <span className="text-slate-300">{prefix}{fmt(budget.used)} / {prefix}{fmt(budget.limit)} {unit}</span>
          <span className={text}>
            {budget.margin >= 0 ? '+' : '−'}{prefix}{fmt(Math.abs(budget.margin))} {unit}
          </span>
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-slate-500">{emptyHint}</p>
      )}
    </div>
  );
}

export default function ConstraintsPanel({ constraints, hasSpacecraft, hasLauncher, budgetSet }: {
  constraints: MissionConstraints;
  hasSpacecraft: boolean;
  hasLauncher: boolean;
  budgetSet: boolean;
}) {
  const b = constraints.breakdown;
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Mission Constraints</h3>
        <p className="text-xs text-slate-500 mt-0.5">Updated live as you configure the mission.</p>
      </div>

      <Gauge
        icon={Weight}
        label="Mass"
        unit="kg"
        budget={constraints.mass}
        available={hasLauncher && hasSpacecraft}
        emptyHint="Select a spacecraft and a launcher to compare mass with payload capacity."
      />
      <Gauge
        icon={Zap}
        label="Energy"
        unit="W"
        budget={constraints.power}
        available={hasSpacecraft}
        emptyHint="Select a spacecraft to see power generation vs. consumption."
      />
      <Gauge
        icon={DollarSign}
        label="Budget"
        unit="M"
        prefix="$"
        budget={constraints.budget}
        available={budgetSet}
        emptyHint="Set an allocated budget in the Mission step."
      />

      <details className="group text-xs">
        <summary className="cursor-pointer text-slate-400 hover:text-slate-200 select-none">Breakdown</summary>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono">
          <dt className="text-slate-500">Bus mass</dt><dd className="text-right text-slate-300">{fmt(b.busMass)} kg</dd>
          <dt className="text-slate-500">Propellant</dt><dd className="text-right text-slate-300">{fmt(b.fuelMass)} kg</dd>
          <dt className="text-slate-500">Instruments</dt><dd className="text-right text-slate-300">{fmt(b.instrumentMass)} kg</dd>
          <dt className="text-slate-500 pt-2">Bus power</dt><dd className="text-right text-slate-300 pt-2">{fmt(b.busPower)} W</dd>
          <dt className="text-slate-500">Instr. power</dt><dd className="text-right text-slate-300">{fmt(b.instrumentPower)} W</dd>
          <dt className="text-slate-500 pt-2">Spacecraft</dt><dd className="text-right text-slate-300 pt-2">${fmt(b.busCost)}M</dd>
          <dt className="text-slate-500">Launcher</dt><dd className="text-right text-slate-300">${fmt(b.launcherCost)}M</dd>
          <dt className="text-slate-500">Instruments</dt><dd className="text-right text-slate-300">${fmt(b.instrumentCost)}M</dd>
        </dl>
      </details>
    </div>
  );
}
