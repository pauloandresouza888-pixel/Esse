import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base relativa: funciona em localhost, em preview e em GitHub Pages sem ajustes.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    assetsInlineLimit: 4096,
  },
});
