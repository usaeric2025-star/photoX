import { app } from './server';
import { serve } from '@hono/node-server';

/**
 * [VITE-SSR-ENTRY] Server Entry for Production
 * This file is built by Vite in SSR mode.
 */

// Non-Vercel production startup
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3000;
  console.log(`>>> Starting production server on port ${port}...`);
  serve({
    fetch: app.fetch,
    port: port,
  });
}

// Export app for Vercel Serverless Functions
export { app };
