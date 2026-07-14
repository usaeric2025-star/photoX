import { build } from 'vite';
import { fileURLToPath } from 'url';

(async () => {
  const result = await build({
    root: process.cwd(),
    build: {
      write: true,
      outDir: 'dist-test',
      rollupOptions: {
        input: './test-wouter.js',
      }
    }
  });
  console.log('Build finished');
})();
