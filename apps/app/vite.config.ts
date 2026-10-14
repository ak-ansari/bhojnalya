// The POS + KDS PWA build (TRD §4.2). The service worker precaches the app
// shell so a till opens with no network; it is never used for API data.
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// The API (REST + Socket.io) in local dev; production serves both behind Caddy on one origin.
const DEV_API_ORIGIN = 'http://localhost:3000';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // ADR 0022: a new version waits for the next launch, never reloads a till mid-bill.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Bhojnalya',
        short_name: 'Bhojnalya',
        description: 'Billing counter and kitchen display',
        start_url: '/',
        display: 'standalone',
        orientation: 'landscape',
        theme_color: '#1E2638',
        background_color: '#F4F5F7',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.googleapis.com' ||
              url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': DEV_API_ORIGIN,
      '/socket.io': { target: DEV_API_ORIGIN, ws: true },
    },
  },
});
