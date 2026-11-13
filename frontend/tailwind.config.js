/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'sans-serif'],
      },
      colors: {
        nova: {
          bg: '#030817',
          panel: '#0a1630',
          line: '#1c3567',
          blue: '#2b8cff',
          sky: '#4fb0ff',
          glow: '#58a6ff',
        },
      },
      keyframes: {
        twinkle: { '0%, 100%': { opacity: '0.25' }, '50%': { opacity: '1' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        pulseDot: { '0%, 100%': { boxShadow: '0 0 0 0 rgba(34,197,94,0.6)' }, '50%': { boxShadow: '0 0 0 5px rgba(34,197,94,0)' } },
      },
      animation: {
        twinkle: 'twinkle 4s ease-in-out infinite',
        float: 'float 9s ease-in-out infinite',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
