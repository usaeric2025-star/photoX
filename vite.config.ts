import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const ReactCompilerConfig = {
  target: '19'
};

// https://vite.dev/config/
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    plugins: [
      react({
        babel: {
          plugins: [
            ["babel-plugin-react-compiler", ReactCompilerConfig],
          ],
        },
      }), 
      tailwindcss(),
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        open: false,
      }) as any,
    ],
    build: {
      emptyOutDir: true,
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            // Layer 0: React 核心 (必須最先載入，絕不依賴其他)
            if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
              return 'vendor-core';
            }

            // Layer 1: 生態與路由 (依賴 Layer 0)
            if (/\/node_modules\/(@tanstack\/react-query)\//.test(id)) {
              return 'vendor-ecosystem';
            }
            
            // Layer 2: UI 元件與圖標 (依賴 Layer 0, 1)
            // 包含 Sonner, Lightbox, Virtua, 動畫與圖標
            if (/\/node_modules\/(lucide-react|@radix-ui|sonner|yet-another-react-lightbox|virtua|motion|el-form-react-components|el-form-react-hooks)\//.test(id)) {
              return 'vendor-ui';
            }
            
            // Layer 3: 功能與資料層 (依賴以上)
            // Supabase, ArkType, Drizzle, Zustand, Postgres, AWS SDK
            if (/\/node_modules\/(@supabase|arktype|drizzle-orm|zustand|postgres|@aws-sdk)\//.test(id)) {
              return 'vendor-features';
            }
            
            // Layer 4: Core Utils Layer
            if (/\/node_modules\/(dayjs|clsx|tailwind-merge)\//.test(id)) {
              return 'vendor-utils';
            }
            
            // Layer 5: 其他
            return 'vendor-misc';
          }
        }
      }
    },
    esbuild: {
      pure: mode === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      '__ADMIN_DIAGNOSTICS__': JSON.stringify(mode !== 'production'),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@api': fileURLToPath(new URL('./api', import.meta.url)),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      overlay: {
        runtimeErrors(error) {
          if (error.message.includes('ResizeObserver')) {
            return false;
          }
          return true;
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
