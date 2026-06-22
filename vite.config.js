import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: (() => {
      // Use local backend when LOCAL_BACKEND=true is set in the environment
      const useLocal = process.env.LOCAL_BACKEND === 'true';
      const target = useLocal ? 'http://localhost:5000' : 'https://ayomide2-backend.onrender.com';
      return {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      };
    })(),
  },
})
