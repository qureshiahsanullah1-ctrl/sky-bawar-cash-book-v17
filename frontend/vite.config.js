import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const devPort = Number(process.env.DEV_PORT) || 5173;
const backendPort = Number(process.env.BACKEND_PORT) || 8000;
const backendTarget = process.env.BACKEND_URL || `http://127.0.0.1:${backendPort}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: devPort,
    strictPort: true,
    proxy: {
      '/health': {
        target: backendTarget,
        changeOrigin: true,
        rewrite: (path) => path
      },
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        rewrite: (path) => path
      },
      '/uploads': {
        target: backendTarget,
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('react')) return 'vendor-react';
            if (id.includes('i18next')) return 'vendor-i18n';
            return 'vendor-utils';
          }
        }
      }
    }
  }
});
