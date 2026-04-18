import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

function normalizeTimestampQueryPlugin() {
  return {
    name: 'normalize-timestamp-query',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (!req.url || !req.url.includes('?')) {
          next();
          return;
        }

        try {
          const parsed = new URL(req.url, 'http://localhost');
          const t = parsed.searchParams.get('t');

          // Guard against malformed decimal values like 1773668332.12949.
          if (t && /^\d+\.\d+$/.test(t)) {
            parsed.searchParams.set('t', String(Math.trunc(Number(t))));
            req.url = `${parsed.pathname}${parsed.search}`;
          }
        } catch {
          // Keep original URL if parsing fails.
        }

        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';
  
  return {
    plugins: [
      normalizeTimestampQueryPlugin(),
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.png', 'icons/*.png'],
        injectRegister: 'auto',
        strategies: 'generateSW',
        manifest: {
          name: 'AetherTrack - Task Management System',
          short_name: 'AetherTrack',
          description: 'A comprehensive, role-based task management system for teams',
          theme_color: '#120E08',
          background_color: '#120E08',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          // Capacitor / Android adaptive icon
          // Place ic_launcher_background.png and ic_launcher_foreground.png
          // in android/app/src/main/res/mipmap-*
          icons: [
            {
              src: '/icons/icon-72x72.png',
              sizes: '72x72',
              type: 'image/png'
            },
            {
              src: '/icons/icon-96x96.png',
              sizes: '96x96',
              type: 'image/png'
            },
            {
              src: '/icons/icon-128x128.png',
              sizes: '128x128',
              type: 'image/png'
            },
            {
              src: '/icons/icon-144x144.png',
              sizes: '144x144',
              type: 'image/png'
            },
            {
              src: '/icons/icon-152x152.png',
              sizes: '152x152',
              type: 'image/png'
            },
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icons/icon-384x384.png',
              sizes: '384x384',
              type: 'image/png'
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB — accommodate large bundles
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\./i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 5 * 60 // 5 minutes
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
                }
              }
            },
            {
              urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'font-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
                }
              }
            }
          ]
        },
        devOptions: {
          enabled: false, // Disable PWA in dev mode to avoid 426 errors
          type: 'module'
        }
      })
    ],
    server: {
      host: '0.0.0.0',
      port: 3001,
      hmr: isDevelopment ? {
        protocol: 'ws',
        host: 'localhost',
        port: 3002, // Use a separate port for HMR to avoid conflicts
      } : false,
      proxy: isDevelopment ? {
        '/api': {
          target: process.env.VITE_API_URL || 'https://aethertracksaas.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        '/auth': {
          target: process.env.VITE_API_URL || 'https://aethertracksaas.onrender.com',
          changeOrigin: true,
          secure: false,
        }
      } : undefined
    },
    resolve: {
      alias: {
        // Primary alias – mirrors tsconfig paths
        '@': resolve(__dirname, 'src'),
        // Convenience sub-aliases
        '@features': resolve(__dirname, 'src/features'),
        '@shared':   resolve(__dirname, 'src/shared'),
        '@app':      resolve(__dirname, 'src/app'),
        '@components': resolve(__dirname, 'src/shared/components'),
        '@hooks':    resolve(__dirname, 'src/shared/hooks'),
        '@utils':    resolve(__dirname, 'src/shared/utils'),
        '@styles':   resolve(__dirname, 'src/styles'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: isDevelopment,
      minify: !isDevelopment ? 'esbuild' : false,
      // Target modern Android WebView (Chrome 90+)
      target: ['es2020', 'chrome90'],
      // Reduce initial bundle size for faster mobile startup
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor':   ['react', 'react-dom', 'react-router-dom'],
            'chart-vendor':   ['recharts'],
            'socket-vendor':  ['socket.io-client'],
            'capacitor-core': ['@capacitor/core'],
          }
        }
      }
    },
    preview: {
      port: 3001,
      host: true
    }
  };
});