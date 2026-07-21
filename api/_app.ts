import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getServerEnv } from '../shared/envSchema.js';
import { errorResponse, successResponse } from './_lib/response.js';
import { logger } from './_lib/logger.js';
import { adminApp } from './_admin.js';
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
    logger.error('❌ [CRITICAL] DATABASE_URL is missing or invalid in serverEnv!');
} else {
    logger.info('✅ [INIT] DATABASE_URL validated, proceeding to route initialization.');
}

const apiApp = new Hono();

// ✅ 統一錯誤處理
apiApp.onError((err, c) => {
    logger.error('[API Error]', err);
    
    // 如果錯誤對象已經自帶明確的 HTTP 狀態碼，則直接使用
    if (err && typeof err === 'object') {
        const anyErr = err as any;
        if (typeof anyErr.statusCode === 'number') {
            return errorResponse(c, err, anyErr.statusCode);
        }
        if (typeof anyErr.status === 'number') {
            return errorResponse(c, err, anyErr.status);
        }
    }
    
    // 避免將資料庫連線失敗、找不到資料庫、或 timeout 等系統/資料庫層面錯誤誤判為 404 Not Found
    const isDbOrNetworkError = 
        err.message?.includes('relation') || 
        err.message?.includes('column') || 
        err.message?.includes('ENOTFOUND') || 
        err.message?.includes('connect') || 
        err.message?.includes('database') || 
        err.message?.includes('timeout') || 
        err.message?.includes('canceling') || 
        err.message?.includes('PostgresError') ||
        err.message?.includes('DrizzleQueryError') ||
        err.message?.includes('pool');

    const isAiPath = c.req.path.startsWith('/api/ai');

    if (isDbOrNetworkError) {
        // 嚴格確保這類錯誤被標記為 500 或以上，不可回傳 404，以便前端觸發 Retry
        return errorResponse(c, err, 500);
    }

    if (!isAiPath && (err.message?.includes('Not found') || err.message?.includes('not found') || err.message?.includes('NotFound'))) {
        return errorResponse(c, err, 404);
    }
    if (err.message?.toLowerCase().includes('foreign key')) {
        const foreignKeyErr = new Error('关联的数据不存在，请刷新页面後重试 (Foreign Key Error)');
        (foreignKeyErr as any).code = 'FOREIGN_KEY_VIOLATION';
        return errorResponse(c, foreignKeyErr, 400);
    }
    return errorResponse(c, err, 500);
});

// ✅ 統一 404 路由不存在處理，紀錄至錯誤日誌並回傳標準 JSON
apiApp.notFound((c) => {
    const { method, path, url } = c.req;
    logger.warn(`[API 404] Route Not Found: [${method}] ${path} (Full URL: ${url})`);
    const err = new Error(`API 路由不存在 (Route Not Found): [${method}] ${path}`);
    return errorResponse(c, err, 404);
});

apiApp.use('*', cors());

// ✅ 請求日誌中間件 (幫助診斷 404 問題)
apiApp.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    if (c.res.status === 404) {
        logger.warn(`[API ACCESS] ${c.req.method} ${c.req.path} - 404 Not Found (${ms}ms)`);
    } else if (c.res.status >= 400) {
        logger.error(`[API ACCESS] ${c.req.method} ${c.req.path} - ${c.res.status} (${ms}ms)`);
    } else {
        // 成功請求不輸出日誌，避免刷屏
    }
});

// 全域中間件（含錯誤處理、Auth、Materialized View 刷新）
setupMiddlewares(apiApp, { NODE_ENV: serverEnv.NODE_ENV });

// --- Health Check Shortcut Route ---
apiApp.get('/health', async (c) => {
    try {
        const { db } = await import('./_lib/db/index.js');
        const { sql } = await import('drizzle-orm');
        const { pingDbWithRetry } = await import('./_lib/utils/timeout.js');
        
        await pingDbWithRetry(db, sql);
        
        return successResponse(c, { 
            status: 'ok', 
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        logger.error('[Health] Root DB Ping failed after retries:', err);
        return errorResponse(c, err, 503);
    }
});

// --- API Routes (Distributed) ---
const routes = apiApp
  .route('/admin', adminApp)
  .route('/public/settings', publicSettings)
  .route('/ai', ai)
  .route('/tags', tags)
  .route('/categories', categories)
  .route('/manufacturers', manufacturers)
  .route('/groups', groups)
  .route('/photos', photos)
  .route('/cron/refresh-view', cronRefreshView)
  .route('/system', system)
  .route('/storage', storage);

export const app = new Hono().route('/api', routes);

export type AppType = typeof app;
