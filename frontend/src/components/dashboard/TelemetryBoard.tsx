"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Gauge, Radio, Zap } from 'lucide-react';
import type { SimulationResult } from '@/lib/mission/types';
import { seedSeries, telemetryBaseline } from '@/lib/mission/dashboard';

function Spark({
  data,
  color,
  gradientId,
}: {
  data: { t: number; v: number }[];
  color: string;
  gradientId: string;
}) {
  const { line, area } = useMemo(() => {
    if (data.length < 2) return { line: '', area: '' };
    const ys = data.map(d => d.v);
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const span = max - min || 1;
    const w = 240;
    const h = 64;
    const pts = data.map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = 8 + (1 - (d.v - min) / span) * (h - 16);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const line = `M${pts.join(' L')}`;
    const area = `${line} L${w},${h} L0,${h} Z`;
    return { line, area };
  }, [data]);

  return (
    <svg viewBox="0 0 240 64" className="mt-3 h-[64px] w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Channel({
  icon: Icon,
  label,
  value,
  unit,
  data,
  color,
  gradientId,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  unit: string;
  data: { t: number; v: number }[];
  color: string;
  gradientId: string;
}) {
  return (
    <article className="rounded-xl border border-nova-line/60 bg-white/[0.03] p-4">
      <header className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
          <Icon className="h-4 w-4 text-nova-sky" aria-hidden />
          {label}
        </p>
        <span className="font-display text-lg font-bold text-white">
          {value} <span className="text-sm font-medium text-slate-400">{unit}</span>
        </span>
      </header>
      <Spark data={data} color={color} gradientId={gradientId} />
    </article>
  );
}

export default function TelemetryBoard({ lastResult }: { lastResult: SimulationResult | null }) {
  const base = useMemo(() => telemetryBaseline(lastResult), [lastResult]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 1400);
    return () => window.clearInterval(id);
  }, []);

  const altitude = useMemo(
    () => seedSeries(11 + tick, 28, base.altitude, Math.max(4, base.altitude * 0.012)),
    [base.altitude, tick],
  );
  const velocity = useMemo(
    () => seedSeries(23 + tick, 28, base.velocity, 0.08),
    [base.velocity, tick],
  );
  const power = useMemo(
    () => seedSeries(37 + tick, 28, base.powerGen - base.powerUse, 8),
    [base.powerGen, base.powerUse, tick],
  );
  const downlink = useMemo(
    () => seedSeries(41 + tick, 28, 92, 6),
    [tick],
  );

  const lastAlt = altitude[altitude.length - 1]?.v ?? base.altitude;
  const lastVel = velocity[velocity.length - 1]?.v ?? base.velocity;
  const lastPwr = power[power.length - 1]?.v ?? base.powerGen - base.powerUse;
  const lastDl = downlink[downlink.length - 1]?.v ?? 92;

  return (
    <section className="nova-card p-5 sm:p-6" aria-label="Télémétrie mission">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg xl:text-xl font-semibold text-white">
            <Activity className="h-6 w-6 text-nova-sky" aria-hidden />
            Télémétrie temps réel
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Flux sol — période orbitale {base.period.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} min
          </p>
        </div>
        <span className="rounded-full border border-nova-sky/40 bg-nova-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-nova-sky">
          Live
        </span>
      </header>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Channel icon={Gauge} label="Altitude" value={lastAlt.toFixed(1)} unit="km" data={altitude} color="#4fb0ff" gradientId="tlm-alt" />
        <Channel icon={Activity} label="Vitesse" value={lastVel.toFixed(2)} unit="km/s" data={velocity} color="#ff9a3c" gradientId="tlm-vel" />
        <Channel icon={Zap} label="Bilan énergie" value={lastPwr.toFixed(0)} unit="W" data={power} color={base.powerOk ? '#22c55e' : '#f43f5e'} gradientId="tlm-pwr" />
        <Channel icon={Radio} label="Liaison descendante" value={lastDl.toFixed(0)} unit="%" data={downlink} color="#7cc4ff" gradientId="tlm-dl" />
      </div>
    </section>
  );
}
