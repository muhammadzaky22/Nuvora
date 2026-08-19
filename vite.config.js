import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192.png','pwa-512.png','maskable-512.png'],
      manifest: {
        name: 'Nuvora',
        short_name: 'Nuvora',
        description: 'Platform undangan digital Web + Android.',
        theme_color: '#17151b',
        background_color: '#f6f1ec',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src:'pwa-192.png', sizes:'192x192', type:'image/png' },
          { src:'pwa-512.png', sizes:'512x512', type:'image/png' },
          { src:'maskable-512.png', sizes:'512x512', type:'image/png', purpose:'maskable' }
        ]
      },
      workbox: { globPatterns:['**/*.{js,css,html,png,svg,ico}'] }
    })
  ]
})
