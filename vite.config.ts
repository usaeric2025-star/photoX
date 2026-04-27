import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      // VitePWA({
      //   registerType: 'autoUpdate',
      //   injectRegister: 'auto',
      //   workbox: {
      //     globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      //     navigateFallback: null,
      //     cleanupOutdatedCaches: true,
      //   },
      //   manifest: {
      //     name: 'photoX',
      //     short_name: 'photoX',
      //     description: '企業內部分行專用產品分類與 AI 輔助相冊系統',
      //     theme_color: '#ffffff',
      //     background_color: '#ffffff',
      //     display: 'standalone',
      //     display_override: ['window-controls-overlay', 'standalone'],
      //     orientation: 'portrait-primary',
      //     start_url: '/',
      //     scope: '/',
      //     categories: ['productivity', 'business', 'utilities'],
      //     icons: [
      //       {
      //         src: '/icon-192.png',
      //         sizes: '192x192',
      //         type: 'image/png',
      //         purpose: 'any'
      //       },
      //       {
      //         src: '/icon-512.png',
      //         sizes: '512x512',
      //         type: 'image/png',
      //         purpose: 'any'
      //       },
      //       {
      //         src: '/icon-512.png',
      //         sizes: '512x512',
      //         type: 'image/png',
      //         purpose: 'maskable'
      //       }
      //     ],
      //     screenshots: [
      //       {
      //         src: '/screenshot-desktop.png',
      //         sizes: '1280x720',
      //         type: 'image/png',
      //         form_factor: 'wide',
      //         label: 'Desktop layout'
      //       },
      //       {
      //         src: '/screenshot-mobile.png',
      //         sizes: '720x1280',
      //         type: 'image/png',
      //         form_factor: 'narrow',
      //         label: 'Mobile layout'
      //       }
      //     ],
      //     shortcuts: [
      //       {
      //         name: '新增照片',
      //         url: '/',
      //         description: '匯入新照片',
      //         icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }]
      //       }
      //     ]
      //   }
      // })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
