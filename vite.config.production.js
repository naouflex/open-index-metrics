import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production configuration - proxy to cache service
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all API calls to the cache service
      '/api': {
        target: process.env.CACHE_SERVICE_URL || 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path // Keep the /api prefix
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          chakra: ['@chakra-ui/react', '@emotion/react', '@emotion/styled'],
          query: ['@tanstack/react-query']
        }
      }
    }
  }
}) 