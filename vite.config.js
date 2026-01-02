import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'


// https://vite.dev/config/
export default defineConfig({
  // Standard build options (uses index.html by default)
  base: './', // Use relative paths for GitHub Pages & Electron support
  build: {
    // Standard build options
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['Piano/**/*', 'tanpura/**/*'],
      manifest: {
        name: 'Samvad - Raga Chord Tool',
        short_name: 'Samvad',
        description: 'Explore raga-based chords and progressions',
        theme_color: '#1e3a8a',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 3000000,
        runtimeCaching: [
          {
            urlPattern: /\/Piano\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'piano-samples',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 } // 30 days
            }
          },
          {
            urlPattern: /\/tanpura\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tanpura-samples',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      }
    })
  ],
})

