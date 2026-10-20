import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base so the build works at https://<user>.github.io/<any-repo-name>/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'Courtside Tides',
        short_name: 'Tides',
        description: 'NBA games, TV channels, odds, standings and daily pick\'em — beach edition.',
        theme_color: '#1b8fb0',
        background_color: '#bfe9ff',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/site\.api\.espn\.com\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'espn-api', networkTimeoutSeconds: 6, expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 3 } },
          },
          {
            urlPattern: /^https:\/\/a\.espncdn\.com\//,
            handler: 'CacheFirst',
            options: { cacheName: 'espn-logos', expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
        ],
      },
    }),
  ],
})
