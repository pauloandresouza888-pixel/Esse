import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Vite config.
 *
 * Key choices (explained for a junior dev):
 * - `base: './'` is not used: the PWA needs absolute URLs for its manifest and
 *   service worker scope, and we deploy at the domain root.
 * - The shared package is aliased to its TypeScript source, so there is no build
 *   step for `packages/shared` during development or production.
 * - Phaser is split into its own chunk: the shell (splash, menu, settings) can
 *   render before the ~1 MB engine arrives.
 */
export default defineConfig(({ mode }) => {
  const isTest = mode === 'test';

  return {
    plugins: [
      react(),
      !isTest &&
        VitePWA({
          // "prompt" lets us show an in-app "update available" snackbar instead
          // of reloading the game while the player is decorating a house.
          registerType: 'prompt',
          injectRegister: 'auto',
          includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
          manifest: {
            name: 'Vida Online',
            short_name: 'Vida Online',
            description:
              'Simulação de vida relaxante para celular: cuide do seu personagem, decore a casa e visite amigos.',
            lang: 'pt-BR',
            dir: 'ltr',
            start_url: '/',
            scope: '/',
            display: 'standalone',
            orientation: 'portrait',
            theme_color: '#FF7A59',
            background_color: '#FFF4E6',
            categories: ['games', 'simulation', 'lifestyle'],
            icons: [
              { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
              {
                src: '/icons/maskable-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,json}'],
            // The Phaser chunk is heavy; raise the default 2 MB precache limit.
            maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
            navigateFallback: '/index.html',
            cleanupOutdatedCaches: true,
            runtimeCaching: [
              {
                // Game art is immutable; cache it forever after first use.
                urlPattern: /\/assets\/.*\.(?:png|webp|svg)$/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'vida-art',
                  expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 },
                },
              },
            ],
          },
          devOptions: {
            enabled: false,
          },
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@vida/shared': fileURLToPath(
          new URL('../../packages/shared/src/index.ts', import.meta.url),
        ),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      // Preview hosts (e2b.app) proxy the dev server; accept any Host header.
      allowedHosts: true,
      hmr: { clientPort: 443, protocol: 'wss' },
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true,
      allowedHosts: true,
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/phaser')) return 'phaser';
            if (id.includes('node_modules/react')) return 'react';
            return undefined;
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./vitest.setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      restoreMocks: true,
    },
  };
});
