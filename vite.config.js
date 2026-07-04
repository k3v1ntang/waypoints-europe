import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function getBuildSha() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

export default defineConfig({
  define: {
    __BUILD_SHA__: JSON.stringify(getBuildSha()),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Waypoints Europe',
        short_name: 'Waypoints',
        description: 'Your European Travel Companion',
        theme_color: '#2563eb',
        background_color: '#2563eb',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Workbox's default precache limit is 2 MiB; the app's own JS bundle
        // (React + maplibre-gl) already exceeds that, which would silently
        // drop it from the precache manifest and break offline app-shell
        // loading. Raised with headroom for dependency growth.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Precache everything fetched at runtime (walking tour guides + maps,
        // future POI photos) in addition to Workbox's default JS/CSS/HTML,
        // so it's available offline without ever having been visited.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,md,json,webmanifest}'],
        // Cache OpenFreeMap tiles/style/sprites/glyphs for offline use during
        // travel - all served from the same domain, so one rule covers it all.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'openfreemap-cache',
              expiration: {
                maxEntries: 4000, // One city at street-level zoom is several hundred tiles
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days - covers full Europe trip
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
})
