import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react()],
    server: {
      proxy: {
        // Proxy API calls to Vercel dev server for development
        '/api': {
          target: process.env.NODE_ENV === 'development' 
            ? 'http://localhost:3000'  // Vercel dev server
            : 'http://localhost:4000', // Local cache service fallback
          changeOrigin: true
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
            ui: ['@chakra-ui/react', '@emotion/react', '@emotion/styled'],
            utils: ['axios', '@tanstack/react-query']
          }
        }
      }
    }
  }
})
