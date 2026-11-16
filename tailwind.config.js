/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: 'rgb(var(--c-brand) / <alpha-value>)',
        emergency: 'rgb(var(--c-emergency) / <alpha-value>)',
        alert: 'rgb(var(--c-alert) / <alpha-value>)',
        caution: 'rgb(var(--c-caution) / <alpha-value>)',
        safe: 'rgb(var(--c-safe) / <alpha-value>)',
        help: 'rgb(var(--c-help) / <alpha-value>)',
        missing: 'rgb(var(--c-missing) / <alpha-value>)',
        navy: 'rgb(var(--c-navy) / <alpha-value>)',
        pending: 'rgb(var(--c-pending) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: { card: '1.25rem' },
      minHeight: { touch: '48px', primary: '64px' },
      keyframes: {
        slowpulse: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
        ring: { '0%': { transform: 'scale(1)', opacity: 0.6 }, '100%': { transform: 'scale(2.2)', opacity: 0 } },
        slidein: { '0%': { transform: 'translateY(-12px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
      },
      animation: {
        slowpulse: 'slowpulse 2s ease-in-out infinite',
        ring: 'ring 1.6s ease-out infinite',
        slidein: 'slidein 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
