import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react()],
    // No proxy needed - all API calls go to cache service via Docker/Nginx
    server: {
      proxy: {
        // Proxy API calls to cache service for development
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true
        }
      }
    }
  }
})
