import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getServerEnv } from '../shared/envSchema.js';
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

// Validate env at module level
const serverEnv = getServerEnv(process.env);

export const app = new Hono().basePath('/api');

app.use('*', cors());
app.get('/health', (c) => c.json({ success: true, status: 'ok' }));

// 全域中間件（含錯誤處理、Auth、Materialized View 刷新）
setupMiddlewares(app, { NODE_ENV: serverEnv.NODE_ENV });

// --- API Routes (Distributed) ---
app.route('/admin', adminApp);
app.route('/public/settings', publicSettings);
app.route('/ai', ai);
app.route('/tags', tags);
app.route('/categories', categories);
app.route('/manufacturers', manufacturers);
app.route('/groups', groups);
app.route('/photos', photos);
app.route('/', storage);
testHandler(app);

// --- 公共輔助路由 ---
app.get('/download', async (c) => {
    try {
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
    } catch (e: unknown) {
        return c.text(e instanceof Error ? e.message : String(e), 500);
    }
});

export type AppType = typeof app;
