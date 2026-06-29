import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getServerEnv } from '../shared/envSchema.js';
import { errorResponse } from './_lib/response.js';
import adminApp from './_admin.js';
import { publicSettings } from './_handlers/public_settings.js';
import { publicAuth } from './_handlers/public_auth.js';
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
    console.error('❌ [CRITICAL] DATABASE_URL is missing!');
    process.exit(1);
}

export const app = new Hono().basePath('/api');

// ✅ 統一錯誤處理
app.onError((err, c) => {
    console.error('[API Error]', err);
    return errorResponse(c, err, 500);
});

app.use('*', cors());
app.get('/health', async (c) => {
    try {
        const { db, furnitureItems } = await import('./_lib/db/index.js');
        const { count, sql } = await import('drizzle-orm');
        
        // 1. Verify DB connectivity first with a fast, lightweight ping
        try {
            await db.execute(sql`SELECT 1`);
        } catch (pingErr) {
            console.error('[Health] DB Ping failed:', pingErr);
            return c.json({
                success: false,
                status: 'error',
                error: `Database connection failed: ${pingErr instanceof Error ? pingErr.message : String(pingErr)}`
            }, 503);
        }

        // 2. Try counting items safely (fallback to -1 if locked or timed out)
        let itemCount = 0;
        let dbStatus = 'connected';
        try {
            const [tableRes] = await db.select({ total: count() }).from(furnitureItems);
            itemCount = Number(tableRes?.total || 0);
        } catch (tableErr) {
            console.warn('[Health] Failed to count furniture_items (likely locked or timed out):', tableErr);
            dbStatus = 'degraded';
            itemCount = -1;
        }

        // 3. Try view count, but don't fail hard if missing
        let photoCount = 0;
        let viewStatus = 'ok';
        try {
            const viewRes = await db.execute(sql`SELECT count(*) FROM v_photos_list`) as any[];
            photoCount = Number(viewRes?.[0]?.count || 0);
        } catch (vErr) {
            console.warn('[Health] v_photos_list query failed (likely missing), attempting repair:', vErr);
            viewStatus = 'missing_attempting_repair';
            // Attempt to repair
            try {
                const { ensureViewExists } = await import('./_lib/db/actions.js');
                await ensureViewExists();
                const viewRes2 = await db.execute(sql`SELECT count(*) FROM v_photos_list`) as any[];
                photoCount = Number(viewRes2?.[0]?.count || 0);
                viewStatus = 'repaired';
            } catch (repairErr) {
                console.error('[Health] View repair failed:', repairErr);
                viewStatus = 'repair_failed';
                dbStatus = 'degraded';
            }
        }
        
        return c.json({ 
            success: true, 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            data: {
                itemCount,
                photoCount,
                viewStatus,
                dbStatus
            }
        });
    } catch (err) {
        console.error('[Health] Hard failure:', err);
        return c.json({ 
            success: false, 
            status: 'error', 
            error: err instanceof Error ? err.message : String(err)
        }, 503);
    }
});

// 全域中間件（含錯誤處理、Auth、Materialized View 刷新）
setupMiddlewares(app, { NODE_ENV: serverEnv.NODE_ENV });

// --- API Routes (Distributed) ---
app.route('/admin', adminApp);
app.route('/public/settings', publicSettings);
app.route('/public/auth', publicAuth);
app.route('/ai', ai);
app.route('/tags', tags);
app.route('/categories', categories);
app.route('/manufacturers', manufacturers);
app.route('/groups', groups);
app.route('/photos', photos);
app.route('/cron/refresh-view', cronRefreshView);
app.route('/', storage);
testHandler(app);

// --- 公共輔助路由 ---
app.get('/download', async (c) => {
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

export type AppType = typeof app;
