/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // clinical accent
        accent: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
          active: '#1e40af',
          soft: '#dbeafe',
          softer: '#eff6ff',
        },
        ink: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50: '#f8fafc',
        },
        status: {
          ready: '#1d4ed8',
          readyBg: '#dbeafe',
          proc: '#b45309',
          procBg: '#fef3c7',
          procBar: '#d97706',
          queued: '#475569',
          queuedBg: '#e2e8f0',
          reviewed: '#7c3aed',
          reviewedBg: '#ede9fe',
          error: '#dc2626',
          errorBg: '#fee2e2',
        },
        good: '#16a34a',
        warn: '#d97706',
        bad: '#dc2626',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15,23,42,0.04), 0 1px 3px 0 rgba(15,23,42,0.06)',
        panel: '0 4px 24px -8px rgba(15,23,42,0.12)',
        float: '0 8px 30px -12px rgba(15,23,42,0.25)',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
};
