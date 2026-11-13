import React from 'react';

/** Deterministic PRNG so server and client render the same stars (no hydration mismatch). */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(2026);
const STARS = Array.from({ length: 260 }, (_, i) => {
  const big = rand() > 0.93;
  return {
    id: i,
    x: rand() * 1600,
    y: rand() * 1000,
    r: big ? 1 + rand() * 0.9 : 0.35 + rand() * 0.6,
    o: 0.35 + rand() * 0.65,
    twinkle: big && rand() > 0.4,
    delay: (rand() * 4).toFixed(2),
  };
});

/** Full-page space background: nebula band, stars and the glowing Earth limb. */
export default function SpaceBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-nova-bg">
      {/* Milky-way / nebula band */}
      <div
        className="absolute -inset-[20%] opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 45% 18% at 62% 22%, rgba(120,140,220,0.18), transparent 70%),' +
            'radial-gradient(ellipse 30% 12% at 40% 12%, rgba(90,120,200,0.12), transparent 70%),' +
            'radial-gradient(ellipse 60% 40% at 15% 70%, rgba(20,50,120,0.25), transparent 70%)',
          transform: 'rotate(-14deg)',
        }}
      />

      {/* Stars */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        {STARS.map(s => (
          <circle
            key={s.id}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#fff"
            opacity={s.o}
            className={s.twinkle ? 'animate-twinkle' : undefined}
            style={s.twinkle ? { animationDelay: `${s.delay}s` } : undefined}
          />
        ))}
      </svg>

      {/* Earth */}
      <div
        className="absolute rounded-full left-[-30vw] top-[520px] w-[190vw] sm:left-[10vw] sm:top-[460px] sm:w-[150vw] lg:left-[40vw] lg:top-[330px] lg:w-[130vw] aspect-square"
        style={{
          background:
            // atmosphere rim + ocean/cloud shading
            'radial-gradient(circle closest-side at 50% 50%, #04122d 0%, #071c42 80%, #0b2b60 92%, #13427f 96.5%, #2f86e0 98.7%, #8fd0ff 99.6%, #d5eeff 100%)',
          boxShadow: '0 0 90px 30px rgba(60,150,255,0.35), 0 0 220px 80px rgba(30,100,220,0.18)',
        }}
      >
        {/* Cloud / continent texture near the limb */}
        <div
          className="absolute inset-0 rounded-full opacity-60 mix-blend-screen"
          style={{
            background:
              'radial-gradient(ellipse 9% 3% at 30% 9%, rgba(220,235,255,0.55), transparent 70%),' +
              'radial-gradient(ellipse 7% 2.5% at 44% 5%, rgba(220,235,255,0.45), transparent 70%),' +
              'radial-gradient(ellipse 12% 4% at 22% 15%, rgba(200,225,255,0.35), transparent 70%),' +
              'radial-gradient(ellipse 10% 3% at 58% 4%, rgba(220,235,255,0.4), transparent 70%),' +
              'radial-gradient(ellipse 16% 6% at 36% 12%, rgba(60,110,90,0.35), transparent 70%),' +
              'radial-gradient(ellipse 14% 5% at 16% 22%, rgba(70,120,100,0.3), transparent 70%)',
          }}
        />
        {/* Night-side shadow so text/cards stay readable */}
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle closest-side at 62% 70%, rgba(2,6,18,0.9) 0%, rgba(2,6,18,0.55) 45%, transparent 70%)' }}
        />
      </div>

    </div>
  );
}
