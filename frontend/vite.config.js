import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';
  
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: isDevelopment ? {
        protocol: 'ws',
        host: 'localhost',
        port: 3000,
      } : false,
      proxy: isDevelopment ? {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        }
      } : undefined
    },
    build: {
      outDir: 'dist',
      sourcemap: isDevelopment,
      minify: !isDevelopment,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'chart-vendor': ['recharts'],
          }
        }
      }
    },
    preview: {
      port: 3000,
      host: true
    }
  };
});