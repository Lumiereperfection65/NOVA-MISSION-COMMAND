"use client";
import React from 'react';
import { Atom, Cog, Home, Satellite, UserRound, Users } from 'lucide-react';
import { NovaLogo, NovaWordmark } from '@/components/visuals/Graphics';

export type AppTab = 'home' | 'missions' | 'simulation' | 'team' | 'resources';

export const NAV_ITEMS: { id: AppTab; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'missions', label: 'Missions', icon: Satellite },
  { id: 'simulation', label: 'Simulation', icon: Atom },
  { id: 'team', label: 'Équipe', icon: Users },
  { id: 'resources', label: 'Ressources', icon: Cog },
];

function Brand() {
  return (
    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
      <NovaLogo className="h-12 w-12 sm:h-16 sm:w-16 xl:h-[84px] xl:w-[84px] shrink-0" />
      <div className="min-w-0 leading-none">
        <NovaWordmark className="text-xl sm:text-2xl xl:text-[34px]" />
        <p className="font-display font-extrabold tracking-wide text-nova-gradient text-sm sm:text-lg xl:text-[27px] mt-0.5 sm:mt-1 whitespace-nowrap">
          MISSION <span className="text-white">COMMAND</span>
        </p>
        <p className="hidden sm:block text-[11px] xl:text-[15px] text-slate-200/90 mt-1.5 whitespace-nowrap">
          Planifier • Simuler • Explorer • Réussir
        </p>
      </div>
    </div>
  );
}

function Greeting() {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <div className="relative">
        <div className="h-11 w-11 xl:h-14 xl:w-14 rounded-full p-[2px] bg-gradient-to-br from-nova-sky to-indigo-500">
          <div className="h-full w-full rounded-full bg-[#0d1b38] flex items-center justify-center">
            <UserRound className="h-6 w-6 xl:h-7 xl:w-7 text-slate-200" aria-hidden />
          </div>
        </div>
        <span className="absolute bottom-0 right-0 h-3 w-3 xl:h-3.5 xl:w-3.5 rounded-full bg-green-500 ring-2 ring-nova-bg animate-pulse-dot" aria-label="En ligne" />
      </div>
      <p className="hidden md:block text-sm xl:text-base leading-snug text-slate-200">
        Bonjour,<br />
        <span className="font-semibold text-white">Commandant !</span>
      </p>
    </div>
  );
}

export default function Header({ active, onNavigate }: { active: AppTab; onNavigate: (tab: AppTab) => void }) {
  return (
    <>
      <header className="relative z-20 border-b border-nova-line/70 bg-nova-bg/55 backdrop-blur-md">
        <div className="mx-auto max-w-[1600px] flex items-center justify-between gap-4 px-4 sm:px-8 xl:px-12 h-20 sm:h-24 xl:h-[138px]">
          <Brand />

          {/* Desktop navigation */}
          <nav aria-label="Navigation principale" className="hidden lg:flex items-stretch self-stretch">
            {NAV_ITEMS.map((item, idx) => {
              const Icon = item.icon;
              const isActive = item.id === active;
              return (
                <React.Fragment key={item.id}>
                  {idx === 1 && <span aria-hidden className="my-auto h-10 w-px bg-nova-line/80" />}
                  <button
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative flex w-[118px] xl:w-[144px] flex-col items-center justify-center gap-2 transition-colors ${
                      isActive ? 'text-nova-sky' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`h-7 w-7 xl:h-8 xl:w-8 transition-transform group-hover:-translate-y-0.5 ${isActive ? 'drop-shadow-[0_0_10px_rgba(79,176,255,0.9)]' : ''}`}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      aria-hidden
                    />
                    <span className="text-[15px] xl:text-[17px] font-medium">{item.label}</span>
                    {isActive && (
                      <>
                        <span className="absolute -bottom-px left-0 right-0 h-[5px] rounded-t-full bg-gradient-to-r from-nova-blue via-nova-sky to-nova-blue shadow-[0_0_18px_4px_rgba(43,140,255,0.7)]" />
                        <span className="pointer-events-none absolute inset-x-2 bottom-0 h-16 bg-gradient-to-t from-nova-blue/25 to-transparent" />
                      </>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>

          <Greeting />
        </div>
      </header>

      {/* Mobile / tablet bottom tab bar */}
      <nav
        aria-label="Navigation principale"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-nova-line/80 bg-nova-bg/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = item.id === active;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${isActive ? 'text-nova-sky' : 'text-slate-400'}`}
              >
                {isActive && <span className="absolute top-0 inset-x-4 h-[3px] rounded-b-full bg-nova-sky shadow-[0_0_12px_2px_rgba(79,176,255,0.7)]" />}
                <Icon className="h-5 w-5" aria-hidden />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
