import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: { chunkSizeWarningLimit: 600 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icon-192x192.png', 'icon-512x512.png'],
      manifest: {
        name: 'Territórios',
        short_name: 'Territórios',
        description: 'Portal e painel de gestão de territórios',
        theme_color: '#163b33',
        background_color: '#f3f0e8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        // Os mapas somam mais de 16 MB. Eles entram no cache apenas quando abertos,
        // evitando um download pesado na primeira visita.
        globPatterns: ['**/*.{js,css,html,ico,svg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\//,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-map-tiles',
              expiration: { maxEntries: 180, maxAgeSeconds: 60 * 60 * 24 * 14 }
            }
          },
          {
            urlPattern: /\/territories\/territorio\d+\.(?:png|jpg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'territory-images',
              expiration: { maxEntries: 55, maxAgeSeconds: 60 * 60 * 24 * 60 }
            }
          }
        ]
      }
    })
  ],
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true }
})
