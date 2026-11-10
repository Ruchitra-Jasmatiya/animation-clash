/* global process */
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_DEV_API || 'http://127.0.0.1:8000'
  return {
    plugins: [react()],
    server: {
      // In dev, /api and /media are forwarded to the Django server.
      proxy: {
        '/api': { target, changeOrigin: true },
        '/media': { target, changeOrigin: true },
      },
    },
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'motion'
            if (id.includes('gsap')) return 'gsap'
            return undefined
          },
        },
      },
    },
  }
})
