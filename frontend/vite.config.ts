import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, redirigimos /api al backend (puerto 3000) para evitar CORS.
// En producción, Caddy sirve el frontend y hace de proxy de /api.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
