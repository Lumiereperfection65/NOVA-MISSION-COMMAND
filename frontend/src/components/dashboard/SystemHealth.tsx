"use client";
import React from 'react';
import { Cpu, Radio, Shield, Thermometer, Wifi, Zap } from 'lucide-react';
import type { SimulationResult } from '@/lib/mission/types';
import type { HealthLevel } from '@/lib/mission/dashboard';

const TONE: Record<HealthLevel, { bar: string; label: string; text: string }> = {
  nominal: { bar: 'bg-green-500', label: 'NOMINAL', text: 'text-green-400' },
  watch: { bar: 'bg-amber-400', label: 'SURVEILLANCE', text: 'text-amber-300' },
  offline: { bar: 'bg-rose-500', label: 'HORS LIGNE', text: 'text-rose-400' },
};

function Row({ icon: Icon, name, level }: { icon: React.ElementType; name: string; level: HealthLevel }) {
  const tone = TONE[level];
  return (
    <li className="flex items-center gap-3 rounded-lg bg-white/[0.025] px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-nova-sky" aria-hidden />
      <span className="flex-1 min-w-0 truncate text-sm text-slate-100">{name}</span>
      <span className={`h-2 w-2 rounded-full ${tone.bar} ${level === 'nominal' ? 'animate-pulse-dot' : ''}`} aria-hidden />
      <span className={`text-[11px] font-semibold tracking-wide ${tone.text}`}>{tone.label}</span>
    </li>
  );
}

export default function SystemHealth({ systemsOk, lastResult }: { systemsOk: boolean | null; lastResult: SimulationResult | null }) {
  const backend: HealthLevel = systemsOk === false ? 'offline' : systemsOk === null ? 'watch' : 'nominal';
  const power: HealthLevel = lastResult?.power_balance && !lastResult.power_balance.is_viable ? 'watch' : backend === 'offline' ? 'watch' : 'nominal';
  const guidance: HealthLevel = lastResult?.mission_status === 'FAILED' ? 'watch' : 'nominal';
  const comms: HealthLevel = backend === 'offline' ? 'offline' : 'nominal';

  const rows = [
    { icon: Wifi, name: 'API Mission Control', level: backend },
    { icon: Radio, name: 'Liaison sol / TTC', level: comms },
    { icon: Zap, name: 'Bus électrique', level: power },
    { icon: Cpu, name: 'Guidage & navigation', level: guidance },
    { icon: Thermometer, name: 'Contrôle thermique', level: 'nominal' as const },
    { icon: Shield, name: 'Intégrité structure', level: 'nominal' as const },
  ];

  return (
    <section className="nova-card p-5 sm:p-6 h-full" aria-label="Santé des systèmes">
      <h2 className="text-lg xl:text-xl font-semibold text-white">Santé des systèmes</h2>
      <p className="mt-1 text-sm text-slate-400">Sous-systèmes critiques du centre de contrôle</p>
      <ul className="mt-4 space-y-1.5">{rows.map(r => <Row key={r.name} {...r} />)}</ul>
    </section>
  );
}
