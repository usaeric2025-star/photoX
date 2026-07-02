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
import { system } from './_handlers/system.js';
import { setupMiddlewares } from './_lib/middleware.js';
import { cronRefreshView } from './_handlers/cron/refresh-view.js';

// Validate env at module level
const serverEnv = getServerEnv(process.env);

// --- Environment Validation ---
if (!serverEnv.DATABASE_URL) {
    console.error('❌ [CRITICAL] DATABASE_URL is missing or invalid in serverEnv!');
} else {
    console.log('✅ [INIT] DATABASE_URL validated, proceeding to route initialization.');
}

export const apiApp = new Hono();

// ✅ 統一錯誤處理
apiApp.onError((err, c) => {
    console.error('[API Error]', err);
    if (err.message?.toLowerCase().includes('foreign key')) {
        err.message = '关联数据不存在，请刷新页面后重试 (Foreign Key Error)';
    }
    return errorResponse(c, err, 500);
});

apiApp.use('*', cors());

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
apiApp.route('/system', system);
apiApp.route('/', storage);

export const app = new Hono().route('/api', apiApp);

export type AppType = typeof app;
