import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: (() => {
      // Use the local backend by default; set LOCAL_BACKEND=false for the hosted API.
      const useLocal = String(process.env.LOCAL_BACKEND || process.env.Local_Backend || 'true').toLowerCase() !== 'false';
      const target = useLocal ? 'http://localhost:5000' : 'https://ayomide2-backend.onrender.com';
      return {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        // Proxy auth endpoints (used directly as /auth/...) to avoid CORS in dev
        '/auth': {
          target,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path, // keep /auth prefix
        },
        '/notifications': {
          target,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
        },
        '/payment': {
          target,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
        },
        '/transfer': {
          target,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
        },
        '/flutterwave': {
          target,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
        },
      };
    })(),
  },
})
