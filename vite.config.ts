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
    worker: {
      format: 'es'
    },
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
      // ✅ 调整 chunk 大小警告阈值
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          format: 'esm',
          // ✅ 手动代码拆分
          manualChunks: (id) => {
            if (id.includes('postgres') || id.includes('pg')) {
              return 'empty';
            }
            // 1. React 核心（稳定，极少变化）
            if (id.includes('node_modules/react/') || 
                id.includes('node_modules/react-dom/') || 
                id.includes('node_modules/react/jsx-runtime')) {
              return 'vendor-react-core';
            }
            // 2. 路由（较少变化）
            if (id.includes('node_modules/wouter/') || 
                id.includes('node_modules/nuqs/')) {
              return 'vendor-router';
            }
            // 3. 数据层（较少变化）
            if (id.includes('node_modules/@tanstack/react-query/')) {
              return 'vendor-query';
            }
            // 4. UI 组件库 (进一步拆分以减小体积)
            if (id.includes('node_modules/lucide-react/')) {
              return 'vendor-lucide';
            }
            if (id.includes('node_modules/motion/') || id.includes('node_modules/framer-motion/')) {
              return 'vendor-motion';
            }
            if (id.includes('node_modules/sonner/')) {
              return 'vendor-ui-core';
            }
            // 5. 工具库（极少变化）
            if (id.includes('node_modules/dayjs/') || 
                id.includes('node_modules/clsx/') || 
                id.includes('node_modules/tailwind-merge/')) {
              return 'vendor-utils';
            }
            // 6. 其他大库（变化少）
            if (id.includes('node_modules/@supabase/') || 
                id.includes('node_modules/drizzle-orm/') || 
                id.includes('node_modules/valibot/')) {
              return 'vendor-other';
            }
            // 7. 剩余 node_modules
            if (id.includes('node_modules/')) {
              return 'vendor-rest';
            }
          },
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      // ✅ 启用 CSS 代码拆分
      cssCodeSplit: true,
      // ✅ 启用源码 map（生产环境可关闭）
      sourcemap: false,
      // ✅ 压缩配置
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true, // 生产环境移除 console
          drop_debugger: true,
        },
      },
    },
    esbuild: {
      pure: mode === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      '__ADMIN_DIAGNOSTICS__': JSON.stringify(mode !== 'production'),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''),
      'process.env': '({ NODE_ENV: ' + JSON.stringify(mode) + ' })',
      'process': '({ env: { NODE_ENV: ' + JSON.stringify(mode) + ' } })',
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
