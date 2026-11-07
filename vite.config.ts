import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    proxy: {
      '/api/playroom/cheats': {
        target: `http://${loadEnv(mode, '.', 'VITE_').VITE_WIZZO_ADDRESS || '192.168.0.118'}:8183`,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      selfDestroying: true,
      manifest: {
        name: 'Mister Playroom',
        short_name: 'Playroom',
        description: 'Remote control for MiSTer FPGA',
        theme_color: '#e7e8e4',
        background_color: '#e7e8e4',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
}))
