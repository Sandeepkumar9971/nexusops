/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // The dark theme's palette — a sophisticated navy console rather than
      // a generic near-black. Referenced as dark:bg-navy-surface etc.
      // throughout shared components. Status colors deliberately reuse
      // Tailwind's own green/amber/red-500 (they already match the spec's
      // success/warning/critical hexes almost exactly).
      colors: {
        navy: {
          bg: '#0B1220',
          sidebar: '#101A2B',
          surface: '#162235',
          surface2: '#1C2B40',
          border: '#334155',
        },
      },
      // Layered, soft shadows (two offsets stacked) read as noticeably more
      // premium than Tailwind's flat default shadow-sm/md — used across
      // Card and its derivatives instead of the stock utilities.
      boxShadow: {
        soft: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)',
        'soft-md': '0 2px 4px -1px rgba(15, 23, 42, 0.05), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
        'soft-lg': '0 8px 16px -4px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.18)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'scale-in': { from: { opacity: 0, transform: 'scale(0.96)' }, to: { opacity: 1, transform: 'scale(1)' } },
        'toast-in': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
        'toast-in': 'toast-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
