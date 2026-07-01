import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getServerEnv } from '../shared/envSchema.js';
import { errorResponse } from './_lib/response.js';
import adminApp from './_admin.js';
import { publicSettings } from './_handlers/public_settings.js';
import { ai } from './_handlers/ai.js';
import { tags } from './_handlers/tags.js';
import { categories } from './_handlers/categories.js';
import { manufacturers } from './_handlers/manufacturers.js';
import { groups } from './_handlers/groups.js';
import { photos } from './_handlers/photos/index.js';
import { storage } from './_handlers/storage.js';
import { testHandler } from './_handlers/test.js';
import { setupMiddlewares } from './_lib/middleware.js';
import { cronRefreshView } from './_handlers/cron/refresh-view.js';

// Validate env at module level
const serverEnv = getServerEnv(process.env);

// --- Environment Validation ---
if (!serverEnv.DATABASE_URL) {
    console.error('❌ [CRITICAL] DATABASE_URL is missing or invalid in serverEnv!');
    process.exit(1);
} else {
    console.log('✅ [INIT] DATABASE_URL validated, proceeding to route initialization.');
}

export const apiApp = new Hono();

// ✅ 統一錯誤處理
apiApp.onError((err, c) => {
    console.error('[API Error]', err);
    return errorResponse(c, err, 500);
});

apiApp.use('*', cors());
apiApp.get('/health', async (c) => {
    try {
        const { db } = await import('./_lib/db/index.js');
        const { sql } = await import('drizzle-orm');
        
        // Fast, lightweight ping to verify DB connectivity
        await db.execute(sql`SELECT 1`);
        
        return c.json({ 
            success: true, 
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
});

// 全域中間件（含錯誤處理、Auth、Materialized View 刷新）
setupMiddlewares(apiApp, { NODE_ENV: serverEnv.NODE_ENV });

// --- API Routes (Distributed) ---
apiApp.route('/admin', adminApp);
apiApp.route('/public/settings', publicSettings);
apiApp.route('/ai', ai);
apiApp.route('/tags', tags);
apiApp.route('/categories', categories);
apiApp.route('/manufacturers', manufacturers);
apiApp.route('/groups', groups);
apiApp.route('/photos', photos);
apiApp.route('/cron/refresh-view', cronRefreshView);
apiApp.route('/', storage);
testHandler(apiApp);

// --- 公共輔助路由 ---
apiApp.get('/download', async (c) => {
    const url = c.req.query('url');
    if (!url) return c.text('Missing url parameter', 400);

    const resp = await fetch(url);
    if (!resp.ok) return c.text('Failed to fetch image', { status: (resp.status >= 400 && resp.status < 600 ? resp.status : 500) as import('hono/utils/http-status').ContentfulStatusCode });

    const buffer = await resp.arrayBuffer();
    const contentType = resp.headers.get('content-type') || 'application/octet-stream';
    
    c.header('Content-Type', contentType);
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    
    return c.body(buffer);
});

export const app = new Hono().route('/api', apiApp);

export type AppType = typeof app;
