/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kuis: {
          bg: '#0a0e14',
          surface: '#111720',
          border: '#1e2a3a',
          hover: '#172030',
          accent: '#00e5a0',
          'accent-dim': '#00b880',
          cyan: '#22d3ee',
          warning: '#f59e0b',
          danger: '#ef4444',
          muted: '#64748b',
          text: '#e2e8f0',
          'text-dim': '#94a3b8',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        display: ['"Outfit"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
