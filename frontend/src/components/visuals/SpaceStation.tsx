import React from 'react';

/** Solar array wing: blue photovoltaic cells framed in gold. */
function SolarWing({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="url(#ss-cells)" stroke="#c9a85a" strokeWidth={1.2} />
      <rect x={x} y={y} width={w} height={h} fill="url(#ss-sheen)" />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke="#d8c48a" strokeWidth={1.4} opacity={0.8} />
    </g>
  );
}

/** Stylised orbital station (original illustration, inline SVG). */
export default function SpaceStation({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 420" className={className} role="img" aria-label="Station spatiale en orbite">
      <defs>
        <pattern id="ss-cells" width="9" height="9" patternUnits="userSpaceOnUse">
          <rect width="9" height="9" fill="#14306b" />
          <rect x="0.6" y="0.6" width="7.8" height="7.8" fill="#1d438f" />
          <path d="M0 4.5H9M4.5 0V9" stroke="#0d214d" strokeWidth="0.6" />
        </pattern>
        <linearGradient id="ss-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9fd0ff" stopOpacity="0.35" />
          <stop offset="0.45" stopColor="#9fd0ff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="ss-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1f4f8" />
          <stop offset="0.5" stopColor="#a9b3c2" />
          <stop offset="1" stopColor="#4b5568" />
        </linearGradient>
        <linearGradient id="ss-metal-v" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4b5568" />
          <stop offset="0.5" stopColor="#e6ebf2" />
          <stop offset="1" stopColor="#59647a" />
        </linearGradient>
        <radialGradient id="ss-light">
          <stop offset="0" stopColor="#ffd28a" />
          <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g transform="rotate(-22 320 210)">
        {/* Solar arrays — left pair */}
        <SolarWing x={70} y={30} w={44} h={165} />
        <SolarWing x={70} y={225} w={44} h={165} />
        <SolarWing x={140} y={42} w={44} h={153} />
        <SolarWing x={140} y={225} w={44} h={153} />
        {/* Solar arrays — right pair */}
        <SolarWing x={456} y={42} w={44} h={153} />
        <SolarWing x={456} y={225} w={44} h={153} />
        <SolarWing x={526} y={30} w={44} h={165} />
        <SolarWing x={526} y={225} w={44} h={165} />

        {/* Main truss */}
        <rect x={50} y={200} width={540} height={20} fill="url(#ss-metal)" rx={2} />
        <path
          d={Array.from({ length: 27 }, (_, i) => `M${50 + i * 20} 200 L${70 + i * 20} 220`).join(' ')}
          stroke="#5b6679"
          strokeWidth={1.2}
        />
        {/* Array masts */}
        {[92, 162, 478, 548].map(x => (
          <rect key={x} x={x - 3} y={194} width={6} height={32} fill="#d9dee6" />
        ))}

        {/* Radiators */}
        <rect x={236} y={150} width={18} height={50} fill="#e9edf3" stroke="#8892a3" />
        <rect x={386} y={220} width={18} height={50} fill="#e9edf3" stroke="#8892a3" />

        {/* Pressurised modules */}
        <rect x={260} y={180} width={120} height={60} rx={14} fill="url(#ss-metal)" stroke="#3d4657" />
        <rect x={296} y={118} width={48} height={184} rx={14} fill="url(#ss-metal-v)" stroke="#3d4657" />
        <circle cx={320} cy={210} r={26} fill="url(#ss-metal)" stroke="#3d4657" />
        <rect x={380} y={192} width={46} height={36} rx={8} fill="url(#ss-metal)" stroke="#3d4657" />
        <rect x={214} y={194} width={46} height={32} rx={8} fill="url(#ss-metal)" stroke="#3d4657" />
        {/* Panel seams */}
        {[278, 300, 340, 362].map(x => (
          <line key={x} x1={x} y1={182} x2={x} y2={238} stroke="#6b7588" strokeWidth={1} />
        ))}
        {[140, 162, 258, 280].map(y => (
          <line key={y} x1={298} y1={y} x2={342} y2={y} stroke="#6b7588" strokeWidth={1} />
        ))}

        {/* Lights */}
        <circle cx={348} cy={226} r={14} fill="url(#ss-light)" />
        <circle cx={348} cy={226} r={3} fill="#ffe6b8" />
        <circle cx={300} cy={300} r={2} fill="#ff6b5a" />
      </g>
    </svg>
  );
}
