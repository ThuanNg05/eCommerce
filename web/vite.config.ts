import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base: '/'` matches the WebView2 virtual host root: https://app.local/ maps to
// the wwwroot folder, so assets resolve at /assets/*. In dev, the proxy forwards
// /api and /health to the standalone ASP.NET Core host (see launchSettings: 5080).
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5080', changeOrigin: true, secure: false },
      '/health': { target: 'http://localhost:5080', changeOrigin: true, secure: false },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
