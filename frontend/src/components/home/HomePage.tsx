"use client";
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Check,
  Clock,
  Radio,
  Rocket,
  Shield,
  Star,
  Target,
  UserRound,
  Users,
} from 'lucide-react';
import type { AppTab } from '@/components/layout/Header';
import SpaceStation from '@/components/visuals/SpaceStation';
import { OrbitSatellite, TelemetryWave } from '@/components/visuals/Graphics';
import TelemetryBoard from '@/components/dashboard/TelemetryBoard';
import SystemHealth from '@/components/dashboard/SystemHealth';
import type { SimulationResult } from '@/lib/mission/types';
import { FLEET, formatUtc, missionControlStatus } from '@/lib/mission/dashboard';

export type ActivityTone = 'blue' | 'green' | 'orange' | 'red';

export interface Activity {
  id: string;
  label: string;
  at: number;
  tone: ActivityTone;
}

const TONE_DOT: Record<ActivityTone, string> = {
  blue: 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]',
  green: 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]',
  orange: 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]',
  red: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]',
};

const STATUS_PILL: Record<'GO' | 'HOLD' | 'NO-GO', string> = {
  GO: 'border-green-600/70 bg-green-950/40 text-green-300',
  HOLD: 'border-amber-600/70 bg-amber-950/35 text-amber-200',
  'NO-GO': 'border-rose-600/70 bg-rose-950/40 text-rose-300',
};

function relativeTime(at: number, now: number | null) {
  if (now === null) return '';
  const min = Math.max(0, Math.round((now - at) / 60000));
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  return `Il y a ${Math.floor(h / 24)} j`;
}

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function StatDot({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'amber' }) {
  return (
    <span className="inline-flex items-center gap-2 text-[15px] sm:text-base text-slate-200">
      <span className={`h-2.5 w-2.5 rounded-full ${tone === 'green' ? 'bg-green-500 animate-pulse-dot' : 'bg-amber-400'}`} aria-hidden />
      {children}
    </span>
  );
}

function SpaceAppsBadge() {
  return (
    <div
      aria-hidden
      className="relative h-24 w-24 sm:h-[104px] sm:w-[104px] shrink-0 rounded-full flex items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(circle at 35% 30%, #3a7bff 0%, #1745b8 55%, #0b2266 100%)', boxShadow: '0 0 24px rgba(43,140,255,0.45)' }}
    >
      {[[18, 22], [70, 18], [80, 60], [26, 72], [56, 82]].map(([x, y]) => (
        <span key={`${x}-${y}`} className="absolute h-1 w-1 rounded-full bg-white/80" style={{ left: `${x}%`, top: `${y}%` }} />
      ))}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <path d="M8 70 C 35 55, 60 40, 96 18" fill="none" stroke="#ff4d4d" strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="50" cy="50" rx="44" ry="13" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.5" transform="rotate(-20 50 50)" />
      </svg>
      <span className="relative font-display font-extrabold text-white text-center leading-[0.95] text-[13px] tracking-wide">
        SPACE<br />APPS<br /><span className="text-[11px] text-sky-200">2026</span>
      </span>
    </div>
  );
}

function KpiCard({
  title,
  value,
  detail,
  icon,
  extra,
}: {
  title: string;
  value: string;
  detail: React.ReactNode;
  icon: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <article className="nova-card min-h-[132px] p-5 xl:px-6 flex items-center gap-4">
      <div className="shrink-0">{icon}</div>
      <div className="relative z-10 min-w-0">
        <h2 className="text-base xl:text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 font-display text-[34px] xl:text-[40px] font-bold leading-none text-white">{value}</p>
        <p className="mt-1.5">{detail}</p>
      </div>
      {extra}
    </article>
  );
}

export default function HomePage({
  onNavigate,
  activities,
  activeMissions,
  systemsOk,
  lastResult,
  lastMissionName,
}: {
  onNavigate: (tab: AppTab) => void;
  activities: Activity[];
  activeMissions: number;
  systemsOk: boolean | null;
  lastResult: SimulationResult | null;
  lastMissionName: string;
}) {
  const now = useNow();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? activities : activities.slice(0, 4);
  const control = missionControlStatus(systemsOk, lastResult);

  const kpis = useMemo(() => {
    const sims = activities.filter(a => a.label.startsWith('Simulation'));
    const ok = sims.filter(a => a.tone === 'blue').length;
    const successRate = sims.length ? Math.round((ok / sims.length) * 100) : 100;
    return {
      successRate,
      score: lastResult ? Math.round(lastResult.score) : 94,
      sims: sims.length,
    };
  }, [activities, lastResult]);

  const fleet = useMemo(() => {
    if (!lastResult || !lastMissionName) return FLEET;
    const live = {
      id: 'live',
      name: lastMissionName,
      destination: lastResult.orbit ? `${Math.round(lastResult.orbit.altitude_km)} km` : 'Simulation',
      phase: lastResult.mission_status === 'SUCCESS' ? 'Opérations' : lastResult.mission_status === 'INVALID' ? 'Revue' : 'Anomalie',
      status: (lastResult.mission_status === 'SUCCESS' ? 'GO' : lastResult.mission_status === 'INVALID' ? 'HOLD' : 'NO-GO') as 'GO' | 'HOLD' | 'NO-GO',
      health: (lastResult.mission_status === 'SUCCESS' ? 'nominal' : lastResult.mission_status === 'INVALID' ? 'watch' : 'offline') as 'nominal' | 'watch' | 'offline',
    };
    return [live, ...FLEET.filter(m => m.name !== lastMissionName)].slice(0, 4);
  }, [lastResult, lastMissionName]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-8 xl:px-8">
      <section className="relative pt-8 sm:pt-12 xl:pt-[56px] pb-6 sm:pb-8 xl:px-7">
        <SpaceStation className="pointer-events-none absolute hidden lg:block right-[-2%] top-[-40px] w-[40%] max-w-[520px] animate-float drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] xl:right-[2%] xl:top-[-60px]" />

        <div className="relative max-w-[760px]">
          <p className="inline-flex items-center gap-2 rounded-full border border-nova-line/80 bg-nova-panel/50 px-3 py-1 text-[11px] sm:text-xs uppercase tracking-[0.18em] text-nova-sky">
            <Radio className="h-3.5 w-3.5" aria-hidden /> Mission Control · Nova Tech Africa
          </p>
          <h1 className="mt-3 font-display leading-[1.08]">
            <span className="block text-[28px] sm:text-[38px] xl:text-[44px] font-semibold text-white">Centre de commandement</span>
            <span className="block text-[30px] sm:text-[42px] xl:text-[50px] font-extrabold tracking-wide text-white drop-shadow-[0_0_24px_rgba(79,176,255,0.35)]">
              NOVA MISSION COMMAND
            </span>
          </h1>
          <p className="mt-3 sm:mt-4 text-base sm:text-xl xl:text-[22px] leading-snug text-slate-100/95 max-w-[540px]">
            Télémétrie, indicateurs de performance et santé des systèmes — un tableau de bord immersif pour piloter vos missions.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            <span className={`rounded-lg border px-3 py-1.5 font-display text-sm font-bold ${STATUS_PILL[control.label]}`}>
              {control.label}
            </span>
            <span className="text-slate-300">{control.detail}</span>
            <span className="hidden sm:inline text-slate-600" aria-hidden>|</span>
            <time className="font-display tabular-nums text-slate-200" dateTime={now !== null ? new Date(now).toISOString() : undefined}>
              UTC {formatUtc(now)}
            </time>
          </div>

          <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-5">
            <button type="button" onClick={() => onNavigate('missions')} className="nova-btn-primary text-lg">
              <Rocket className="h-5 w-5" aria-hidden />
              Lancer une mission
              <ArrowRight className="h-5 w-5" aria-hidden />
            </button>
            <button type="button" onClick={() => onNavigate('simulation')} className="nova-btn-outline text-lg">
              <BarChart3 className="h-5 w-5" aria-hidden />
              Accéder à la simulation
            </button>
          </div>
        </div>
      </section>

      <section aria-label="Indicateurs de performance" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-5">
        <KpiCard
          title="Missions actives"
          value={String(activeMissions)}
          detail={<StatDot>En cours</StatDot>}
          icon={<Target className="h-10 w-10 text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.6)]" strokeWidth={2.4} aria-hidden />}
          extra={<OrbitSatellite className="pointer-events-none absolute right-0 top-0 h-full w-[48%] opacity-80" />}
        />
        <KpiCard
          title="Taux de succès"
          value={`${kpis.successRate}%`}
          detail={<StatDot>{kpis.sims} simulation{kpis.sims > 1 ? 's' : ''}</StatDot>}
          icon={<Star className="h-10 w-10 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.55)]" fill="currentColor" aria-hidden />}
        />
        <KpiCard
          title="Systèmes"
          value={systemsOk === false ? '—' : '100%'}
          detail={systemsOk === false ? <StatDot tone="amber">Backend hors ligne</StatDot> : <StatDot>Opérationnels</StatDot>}
          icon={(
            <div className="relative h-10 w-10" aria-hidden>
              <Shield className="h-10 w-10 text-green-500 drop-shadow-[0_0_12px_rgba(34,197,94,0.55)]" fill="currentColor" strokeWidth={1.5} />
              <Check className="absolute left-1/2 top-[46%] h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-[#04210f]" strokeWidth={3.5} />
            </div>
          )}
          extra={<TelemetryWave className="pointer-events-none absolute right-0 bottom-4 h-[58px] w-[46%]" />}
        />
        <KpiCard
          title="Équipe"
          value="12"
          detail={<StatDot>membres</StatDot>}
          icon={<Users className="h-10 w-10 text-nova-blue drop-shadow-[0_0_12px_rgba(43,140,255,0.6)]" fill="currentColor" strokeWidth={1.5} aria-hidden />}
          extra={(
            <div className="ml-auto hidden sm:flex items-center -space-x-2" aria-label="12 membres">
              {['from-sky-400 to-indigo-600', 'from-amber-400 to-orange-600'].map(g => (
                <span key={g} className={`h-9 w-9 rounded-full bg-gradient-to-br ${g} p-[2px] ring-2 ring-nova-panel`}>
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-[#0f1f40]">
                    <UserRound className="h-5 w-5 text-slate-200" aria-hidden />
                  </span>
                </span>
              ))}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1a2c55] ring-2 ring-nova-panel text-xs font-semibold text-slate-100">+10</span>
            </div>
          )}
        />
      </section>

      <section className="mt-4 xl:mt-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)] gap-4 xl:gap-5">
        <TelemetryBoard lastResult={lastResult} />
        <SystemHealth systemsOk={systemsOk} lastResult={lastResult} />
      </section>

      <section className="mt-4 xl:mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-5">
        <article className="nova-card p-5 sm:p-6 lg:col-span-2">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg xl:text-xl font-semibold text-white">Statut des missions</h2>
            {lastResult && (
              <p className="text-sm text-slate-400">
                Dernier score <span className="font-display font-bold text-nova-sky">{Math.round(lastResult.score)}</span>
              </p>
            )}
          </header>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <caption className="sr-only">Missions suivies par le centre de contrôle</caption>
              <thead className="text-[11px] uppercase tracking-wider text-slate-400">
                <tr className="border-b border-nova-line/70">
                  <th className="pb-2 font-medium">Mission</th>
                  <th className="pb-2 font-medium">Destination</th>
                  <th className="pb-2 font-medium">Phase</th>
                  <th className="pb-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {fleet.map(m => (
                  <tr key={m.id} className="border-b border-white/[0.04]">
                    <td className="py-3 font-medium text-white">{m.name}</td>
                    <td className="py-3 text-slate-300">{m.destination}</td>
                    <td className="py-3 text-slate-300">{m.phase}</td>
                    <td className="py-3">
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${STATUS_PILL[m.status]}`}>{m.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="nova-card p-5 sm:p-6">
          <header className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Clock className="h-6 w-6 text-nova-sky" aria-hidden /> Activités
            </h2>
            {activities.length > 4 && (
              <button type="button" onClick={() => setShowAll(v => !v)} className="inline-flex items-center gap-1 text-sm text-nova-sky hover:text-white">
                {showAll ? 'Réduire' : 'Voir tout'} <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </header>
          <ul className="mt-4 space-y-1.5">
            {visible.map(a => (
              <li key={a.id} className="flex items-center gap-3 rounded-lg bg-white/[0.025] px-3 py-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONE_DOT[a.tone]}`} aria-hidden />
                <span className="flex-1 min-w-0 truncate text-[14px] text-slate-100">{a.label}</span>
                <time dateTime={now !== null ? new Date(a.at).toISOString() : undefined} className="shrink-0 text-xs text-slate-400">
                  {relativeTime(a.at, now)}
                </time>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-4 xl:mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-5 pb-28 lg:pb-12">
        <article className="nova-card p-6 xl:px-7">
          <h2 className="text-center text-lg xl:text-xl font-semibold text-white">Défis Space Apps 2026</h2>
          <div className="mt-4 flex items-center gap-5 sm:gap-7">
            <SpaceAppsBadge />
            <div>
              <p className="text-[16px] xl:text-[17px] leading-snug text-slate-200">
                Participez au NASA Space Apps Challenge et innovez pour demain !
              </p>
              <a
                href="https://www.spaceappschallenge.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-nova-sky/50 px-6 py-2.5 text-[15px] font-medium text-slate-100 hover:border-nova-sky hover:bg-nova-blue/10 transition-colors"
              >
                En savoir plus <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </article>

        <article className="nova-card min-h-[190px] p-6 xl:px-7">
          <div
            aria-hidden
            className="pointer-events-none absolute left-[-30%] right-[-30%] top-[62%] h-[300%] rounded-[50%]"
            style={{
              background: 'radial-gradient(ellipse closest-side, #06193d 0%, #0b2c63 80%, #2f86e0 95%, #bfe4ff 100%)',
              boxShadow: '0 -6px 40px 6px rgba(79,176,255,0.55)',
            }}
          />
          <div className="relative">
            <h2 className="flex items-center gap-3 text-lg xl:text-xl font-semibold text-white">
              <Star className="h-7 w-7 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]" fill="currentColor" aria-hidden /> Notre mission
            </h2>
            <p className="mt-4 max-w-[360px] text-[16px] xl:text-[17px] leading-snug text-slate-100">
              Construire ensemble un avenir spatial plus durable et inclusif — depuis Pointe-Noire vers l&apos;orbite.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}
