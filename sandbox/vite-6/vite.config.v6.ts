import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * [VITE6-BUILD-COMPAT]: High compatibility.
 * - Vite 6 environment API is the main change, not breaking standard SPA usage.
 * - HMR performance expected to improve due to better dependency graph handling.
 */
export default defineConfig({
  plugins: [react()],
  // Vite 6 specific configs if any (e.g. enhanced environment options)
  build: {
    target: 'esnext',
  }
});
