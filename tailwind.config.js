/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Explicit attribute — must not follow the phone OS when user picks Light.
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      // Semantic tokens; values live in src/index.css. The default Tailwind
      // palette stays available, so nothing breaks mid-migration.
      colors: {
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        field: 'rgb(var(--field) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        sunken: 'rgb(var(--sunken) / <alpha-value>)',
        hover: 'rgb(var(--hover) / <alpha-value>)',
        chrome: 'rgb(var(--chrome) / <alpha-value>)',
        selected: 'rgb(var(--selected) / <alpha-value>)',

        divider: 'rgb(var(--divider) / <alpha-value>)',
        edge: 'rgb(var(--edge) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        'line-strong': 'rgb(var(--line-strong) / <alpha-value>)',

        content: {
          DEFAULT: 'rgb(var(--content) / <alpha-value>)',
          muted: 'rgb(var(--content-muted) / <alpha-value>)',
          subtle: 'rgb(var(--content-subtle) / <alpha-value>)',
          faint: 'rgb(var(--content-faint) / <alpha-value>)',
        },

        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          ink: 'rgb(var(--accent-ink) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
        },
        'on-accent': {
          DEFAULT: 'rgb(var(--on-accent) / <alpha-value>)',
          muted: 'rgb(var(--on-accent-muted) / <alpha-value>)',
          track: 'rgb(var(--on-accent-track) / <alpha-value>)',
        },

        goal: {
          'on-target': 'rgb(var(--goal-on-target) / <alpha-value>)',
          'in-range': 'rgb(var(--goal-in-range) / <alpha-value>)',
          over: 'rgb(var(--goal-over) / <alpha-value>)',
        },

        health: {
          DEFAULT: 'rgb(var(--health) / <alpha-value>)',
          hover: 'rgb(var(--health-hover) / <alpha-value>)',
          ink: 'rgb(var(--health-ink) / <alpha-value>)',
          soft: 'rgb(var(--health-soft) / <alpha-value>)',
        },

        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          strong: 'rgb(var(--danger-strong) / <alpha-value>)',
          soft: 'rgb(var(--danger-soft) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
}
