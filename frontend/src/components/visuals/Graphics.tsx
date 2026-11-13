import React from 'react';
import { Rocket } from 'lucide-react';

/** App logo: blue planet, orbit ring and a rocket taking off. */
export function NovaLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="logo-planet" cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#7cc4ff" />
            <stop offset="0.45" stopColor="#2b6fe0" />
            <stop offset="1" stopColor="#0b1f5c" />
          </radialGradient>
          <linearGradient id="logo-ring" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ff9a3c" />
            <stop offset="0.5" stopColor="#ffd28a" />
            <stop offset="1" stopColor="#4fb0ff" />
          </linearGradient>
        </defs>
        <circle cx="46" cy="54" r="30" fill="url(#logo-planet)" />
        <ellipse cx="50" cy="56" rx="46" ry="14" fill="none" stroke="url(#logo-ring)" strokeWidth="3.5" transform="rotate(-28 50 56)" />
      </svg>
      <Rocket className="absolute left-[30%] top-[14%] h-[52%] w-[52%] text-white drop-shadow-[0_0_8px_rgba(255,170,90,0.8)]" strokeWidth={2.2} />
    </div>
  );
}

/** "NOVA" wordmark with the O drawn as a glowing planet. */
export function NovaWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center font-display font-extrabold tracking-wide text-white ${className}`}>
      N
      <span
        aria-hidden
        className="mx-[0.06em] inline-block h-[0.72em] w-[0.72em] rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #9ad4ff 25%, #2b8cff 60%, #0b2c63 100%)',
          boxShadow: '0 0 10px 2px rgba(79,176,255,0.85)',
        }}
      />
      <span className="sr-only">O</span>
      VA
    </span>
  );
}

/** Small orbit + satellite illustration for the "Missions actives" card. */
export function OrbitSatellite({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 130" className={className} aria-hidden>
      <defs>
        <radialGradient id="os-earth" cx="0.7" cy="0.9" r="0.9">
          <stop offset="0" stopColor="#0b2c63" />
          <stop offset="0.85" stopColor="#14529e" />
          <stop offset="1" stopColor="#6cc0ff" />
        </radialGradient>
      </defs>
      <circle cx="190" cy="190" r="110" fill="url(#os-earth)" opacity="0.9" />
      <ellipse cx="110" cy="72" rx="78" ry="26" fill="none" stroke="#4fb0ff" strokeOpacity="0.55" strokeDasharray="3 4" transform="rotate(-12 110 72)" />
      <ellipse cx="110" cy="72" rx="58" ry="18" fill="none" stroke="#7cc4ff" strokeOpacity="0.35" transform="rotate(-12 110 72)" />
      <circle cx="44" cy="84" r="3" fill="#7cc4ff" />
      <circle cx="44" cy="84" r="7" fill="#4fb0ff" opacity="0.25" />
      <g transform="translate(150 46) rotate(-35)">
        <rect x="-44" y="-7" width="30" height="14" fill="#1d438f" stroke="#c9a85a" strokeWidth="0.8" />
        <rect x="14" y="-7" width="30" height="14" fill="#1d438f" stroke="#c9a85a" strokeWidth="0.8" />
        <path d="M-44 0H44" stroke="#c9d2de" strokeWidth="1" />
        <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#dfe5ee" stroke="#5b6679" />
        <circle cx="0" cy="0" r="4" fill="#ff9a3c" />
      </g>
      <circle cx="176" cy="96" r="5" fill="#ff9a3c" opacity="0.9" />
      <circle cx="176" cy="96" r="11" fill="#ff9a3c" opacity="0.2" />
    </svg>
  );
}

/** Glowing telemetry wave for the "Systèmes" card. */
export function TelemetryWave({ className = '' }: { className?: string }) {
  const d = 'M0 52 C 20 52, 26 40, 40 40 S 60 60, 76 56 S 96 10, 112 12 S 130 62, 146 58 S 162 30, 176 32 S 196 54, 210 50 S 226 30, 240 34';
  return (
    <svg viewBox="0 0 240 70" className={className} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="tw-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#22c55e" stopOpacity="0" />
          <stop offset="0.25" stopColor="#22c55e" />
          <stop offset="1" stopColor="#4ade80" />
        </linearGradient>
        <filter id="tw-glow" x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <path d={d} fill="none" stroke="#22c55e" strokeWidth="5" opacity="0.5" filter="url(#tw-glow)" />
      <path d={d} fill="none" stroke="url(#tw-stroke)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
