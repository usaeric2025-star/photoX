import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
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
    experimental: {
      bundledDev: true,
    },
    base: '/',
    plugins: [
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
      rollupOptions: {
        output: {
          advancedChunks: {
            groups: [
              {
                name: 'vendor-core',
                test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              },
              {
                name: 'vendor-ui',
                test: /[\\/]node_modules[\\/](lucide-react|@radix-ui|sonner|yet-another-react-lightbox|virtua|motion|el-form-react-components|el-form-react-hooks)[\\/]/,
              },
              {
                name: 'vendor-features',
                test: /[\\/]node_modules[\\/](@supabase|drizzle-orm|postgres|@aws-sdk)[\\/]/,
              },
              {
                name: 'vendor-utils',
                test: /[\\/]node_modules[\\/](dayjs|clsx|tailwind-merge|valibot|swr)[\\/]/,
              }
            ],
          },
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
        '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
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
