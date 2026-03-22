// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import path from "path";
// import { fileURLToPath } from "url";

// const __dirname = path.dirname(fileURLToPath(import.meta.url));

// // https://vite.dev/config/
// export default defineConfig({
  //   plugins: [react(), tailwindcss()],
  //   resolve: {
    //     alias: {
      //       "@": path.resolve(__dirname, "./src"),
      //     },
      //   },
      // });
      
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'CivicSync Kiosk',
        short_name: 'CivicSync',
        theme_color: '#1E3A5F',
        display: 'standalone',
        icons: [
          { src: '/apple-touch-icon.png', sizes: '192x192', type: 'image/png' },
          { src: '/Logo.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            // API Caching: Cache GET requests (Bills, Services)
            urlPattern: /^https:\/\/your-backend-url\.onrender\.com\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache static assets
            urlPattern: /\.(?:png|jpg|jpeg|svg|css|js)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
            }
          }
        ]
      }
    })
  ],
});