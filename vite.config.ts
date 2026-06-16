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
      mode === 'analyze' && visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        open: true,
      }) as any,
    ],
    build: {
      emptyOutDir: true,
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor';
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
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
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
