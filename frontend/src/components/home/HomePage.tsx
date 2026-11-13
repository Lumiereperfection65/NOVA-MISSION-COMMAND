"use client";
import React, { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, Check, Clock, Rocket, Shield, Star, Target, UserRound, Users } from 'lucide-react';
import type { AppTab } from '@/components/layout/Header';
import SpaceStation from '@/components/visuals/SpaceStation';
import { OrbitSatellite, TelemetryWave } from '@/components/visuals/Graphics';

export type ActivityTone = 'blue' | 'green' | 'orange' | 'red';

export interface Activity {
  id: string;
  label: string;
  at: number; // epoch ms
  tone: ActivityTone;
}

const TONE_DOT: Record<ActivityTone, string> = {
  blue: 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]',
  green: 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]',
  orange: 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]',
  red: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]',
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

/** Re-renders every 30 s so relative times stay fresh; null until mounted (avoids hydration mismatch). */
function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
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

export default function HomePage({ onNavigate, activities, activeMissions, systemsOk }: {
  onNavigate: (tab: AppTab) => void;
  activities: Activity[];
  activeMissions: number;
  systemsOk: boolean | null;
}) {
  const now = useNow();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? activities : activities.slice(0, 3);

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-8 xl:px-8">
      {/* ------------------------------------------------------------ Hero */}
      <section className="relative pt-10 sm:pt-14 xl:pt-[70px] pb-10 sm:pb-12 xl:pb-[46px] xl:px-7">
        <SpaceStation className="pointer-events-none absolute hidden md:block right-[-2%] top-[-50px] w-[44%] max-w-[560px] animate-float drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] xl:right-[3%] xl:top-[-70px]" />

        <div className="relative max-w-[680px]">
          <h1 className="font-display leading-[1.08]">
            <span className="block text-[32px] sm:text-[42px] xl:text-[48px] font-semibold text-white">Bienvenue sur</span>
            <span className="block text-[34px] sm:text-[46px] xl:text-[52px] font-extrabold tracking-wide text-white drop-shadow-[0_0_24px_rgba(79,176,255,0.35)]">
              NOVA MISSION COMMAND
            </span>
          </h1>
          <p className="mt-4 sm:mt-5 text-lg sm:text-[22px] xl:text-[25px] leading-snug text-slate-100/95 max-w-[520px]">
            Votre centre de commandement pour explorer l&apos;espace et relever les grands défis.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-4 sm:gap-7">
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

      {/* ------------------------------------------------------------ Stat cards */}
      <section aria-label="Indicateurs" className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-6">
        <article className="nova-card min-h-[140px] p-6 xl:px-8 flex items-center gap-6">
          <Target className="h-12 w-12 shrink-0 text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.6)]" strokeWidth={2.4} aria-hidden />
          <div className="relative z-10">
            <h2 className="text-lg xl:text-xl font-semibold text-white">Missions actives</h2>
            <p className="mt-2 flex items-end gap-3">
              <span className="font-display text-[44px] font-bold leading-none text-white">{activeMissions}</span>
              <StatDot>En cours</StatDot>
            </p>
          </div>
          <OrbitSatellite className="pointer-events-none absolute right-0 top-0 h-full w-[46%] opacity-90" />
        </article>

        <article className="nova-card min-h-[140px] p-6 xl:px-8 flex items-center gap-6">
          <div className="relative h-12 w-12 shrink-0" aria-hidden>
            <Shield className="h-12 w-12 text-green-500 drop-shadow-[0_0_12px_rgba(34,197,94,0.55)]" fill="currentColor" strokeWidth={1.5} />
            <Check className="absolute left-1/2 top-[46%] h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-[#04210f]" strokeWidth={3.5} />
          </div>
          <div className="relative z-10">
            <h2 className="text-lg xl:text-xl font-semibold text-white">Systèmes</h2>
            <p className="mt-2 font-display text-[40px] font-bold leading-none text-white">{systemsOk === false ? '—' : '100%'}</p>
            <p className="mt-1.5">
              {systemsOk === false
                ? <StatDot tone="amber">Backend hors ligne</StatDot>
                : <StatDot>Opérationnels</StatDot>}
            </p>
          </div>
          <TelemetryWave className="pointer-events-none absolute right-0 bottom-6 h-[70px] w-[52%]" />
        </article>

        <article className="nova-card min-h-[140px] p-6 xl:px-8 flex items-center gap-6">
          <Users className="h-12 w-12 shrink-0 text-nova-blue drop-shadow-[0_0_12px_rgba(43,140,255,0.6)]" fill="currentColor" strokeWidth={1.5} aria-hidden />
          <div className="relative z-10">
            <h2 className="text-lg xl:text-xl font-semibold text-white">Équipe</h2>
            <p className="mt-2 font-display text-[40px] font-bold leading-none text-white">12</p>
            <p className="mt-1.5"><StatDot>membres</StatDot></p>
          </div>
          <div className="ml-auto flex items-center -space-x-3" aria-label="12 membres, dont 4 affichés">
            {['from-sky-400 to-indigo-600', 'from-amber-400 to-orange-600', 'from-emerald-400 to-teal-600'].map(g => (
              <span key={g} className={`h-12 w-12 rounded-full bg-gradient-to-br ${g} p-[2px] ring-2 ring-nova-panel`}>
                <span className="flex h-full w-full items-center justify-center rounded-full bg-[#0f1f40]">
                  <UserRound className="h-6 w-6 text-slate-200" aria-hidden />
                </span>
              </span>
            ))}
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1a2c55] ring-2 ring-nova-panel text-sm font-semibold text-slate-100">+8</span>
          </div>
        </article>
      </section>

      {/* ------------------------------------------------------------ Bottom cards */}
      <section className="mt-4 xl:mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-6 pb-28 lg:pb-12">
        <article className="nova-card p-6 xl:px-7">
          <header className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-3 text-lg xl:text-xl font-semibold text-white">
              <Clock className="h-7 w-7 text-nova-sky" aria-hidden /> Dernières activités
            </h2>
            {activities.length > 3 && (
              <button type="button" onClick={() => setShowAll(v => !v)} className="inline-flex items-center gap-1 text-sm text-nova-sky hover:text-white">
                {showAll ? 'Réduire' : 'Voir tout'} <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </header>
          <ul className="mt-4 space-y-1.5">
            {visible.map(a => (
              <li key={a.id} className="flex items-center gap-4 rounded-lg bg-white/[0.025] px-3 py-2">
                <span className={`h-3 w-3 shrink-0 rounded-full ${TONE_DOT[a.tone]}`} aria-hidden />
                <span className="flex-1 min-w-0 truncate text-[15px] text-slate-100">{a.label}</span>
                <time dateTime={now !== null ? new Date(a.at).toISOString() : undefined}className="shrink-0 text-sm text-slate-400">{relativeTime(a.at, now)}</time>
              </li>
            ))}
          </ul>
        </article>

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
          {/* Earth horizon glow */}
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
            <p className="mt-4 max-w-[300px] text-[16px] xl:text-[17px] leading-snug text-slate-100">
              Construire ensemble un avenir spatial plus durable et inclusif.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}
