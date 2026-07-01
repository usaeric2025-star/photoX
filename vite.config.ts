import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const ReactCompilerConfig = {
  target: '19'
};

// https://vite.dev/config/
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    experimental: {
      bundledDev: true,
    },
    base: '/',
    plugins: [
      nodePolyfills({
        globals: {
          Buffer: true,
        },
      }),
      babel({
        include: /\.[jt]sx?$/,
        babelConfig: {
          plugins: [
            ["babel-plugin-react-compiler", ReactCompilerConfig],
          ],
        },
      }),
      react(), 
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
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('postgres') || id.includes('pg')) {
              return 'empty';
            }
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler') || id.includes('react-router')) {
                return 'vendor-react';
              }
              if (id.includes('@storve/core') || id.includes('@storve/react')) {
                return 'vendor-storve';
              }
              if (id.includes('@supabase/')) {
                return 'vendor-supabase';
              }
              if (id.includes('@tanstack/react-form') || id.includes('@tanstack/valibot-form-adapter') || id.includes('valibot') || id.includes('drizzle')) {
                return 'vendor-form';
              }
              if (
                id.includes('lucide-react') || 
                id.includes('sonner') || 
                id.includes('@mshafiqyajid/react-lightbox') || 
                id.includes('virtua') ||
                id.includes('react-image-gallery')
              ) {
                return 'vendor-ui';
              }
              return 'vendor'; // all other dependencies
            }
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
      alias: [
        { find: 'postgres', replacement: fileURLToPath(new URL('./empty-module.js', import.meta.url)) },
      ],
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
