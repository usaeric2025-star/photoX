import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * [VITE7-READINESS-PROBE] 
 * Preparing for Vite 7 / Vite 8 features:
 * - Rolldown integration (implicit in target versions)
 * - Improved ESM build characteristics
 * - Optimized CSS injection via Tailwind 4
 */
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Vite 7/8 recommendation: more aggressive code splitting
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('@tanstack')) return 'vendor-tanstack';
            if (id.includes('motion')) return 'vendor-motion';
            return 'vendor';
          }
        }
      }
    },
    // Target environment for next gen
    target: 'esnext',
    minify: 'esbuild', // Switching to esbuild for fastest CI/CD builds
  },
  server: {
    // Ensure 0.0.0.0 and port 3000 for AI Studio compliance
    host: '0.0.0.0',
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  }
});
