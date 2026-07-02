import { Hono } from 'hono';
import { successResponse, errorResponse } from '../_lib/response.js';
import { withTimeout, TIMEOUTS } from '../_lib/utils/timeout.js';

export const system = new Hono()
  .get('/health', async (c) => {
    try {
        const { db } = await import('../_lib/db/index.js');
        const { sql } = await import('drizzle-orm');
        
        // Fast, lightweight ping to verify DB connectivity
        const dbPromise = db.execute(sql`SELECT 1`);
        await withTimeout(dbPromise, TIMEOUTS.PUBLIC_META, 'Health DB Ping');
        
        return successResponse(c, { 
            status: 'ok', 
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('[Health] DB Ping or connection failed:', err);
        return c.json({ 
            success: false, 
            status: 'error', 
            error: err instanceof Error ? err.message : String(err)
        }, 503);
    }
  })
  .get('/download', async (c) => {
    const url = c.req.query('url');
    if (!url) return c.text('Missing url parameter', 400);

    try {
        const resp = await fetch(url);
        if (!resp.ok) return c.text('Failed to fetch image', { status: (resp.status >= 400 && resp.status < 600 ? resp.status : 500) as import('hono/utils/http-status').ContentfulStatusCode });

        const buffer = await resp.arrayBuffer();
        const contentType = resp.headers.get('content-type') || 'application/octet-stream';
        
        c.header('Content-Type', contentType);
        c.header('Access-Control-Allow-Origin', '*');
        c.header('Cache-Control', 'public, max-age=31536000, immutable');
        
        return c.body(buffer);
    } catch (err) {
        return c.text('Image fetch error', 500);
    }
  })
  .get('/test-ping', (c) => {
    return successResponse(c, { message: 'pong', env: process.env.NODE_ENV });
  })
  .get('/debug-db-errors', async (c) => {
    try {
        const { db } = await import('../_lib/db/index.js');
        const { desc } = await import('drizzle-orm');
        const { systemLogs } = await import('../_lib/db/schema.js');
        
        const logs = await db.select().from(systemLogs).orderBy(desc(systemLogs.createdAt)).limit(15);
        return successResponse(c, { logs });
    } catch (err) {
        return errorResponse(c, err);
    }
  });
