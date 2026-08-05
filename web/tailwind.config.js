/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        surface: 'var(--bg-surface)',
        hover: 'var(--bg-hover)',
        active: 'var(--bg-active)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        ink: 'var(--ink)',
        'ink-hover': 'var(--ink-hover)',
        accent: 'var(--accent)',
        'accent-weak': 'var(--accent-weak)',
        'text-primary': 'var(--text-primary)',
        'text-body': 'var(--text-body)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
      },
      borderRadius: {
        DEFAULT: '6px',
        card: '8px',
      },
      boxShadow: {
        overlay: 'var(--shadow-overlay)',
      },
    },
  },
  plugins: [],
  // Let MUI's CssBaseline own the global reset to avoid clashing with Tailwind's.
  corePlugins: { preflight: false },
}
