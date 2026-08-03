/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
  // Let MUI's CssBaseline own the global reset to avoid clashing with Tailwind's.
  corePlugins: { preflight: false },
}
