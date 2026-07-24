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
import { AppError } from '../shared/AppError.js';
import { HTTPException } from 'hono/http-exception';
import { type StatusCode, type ContentfulStatusCode } from 'hono/utils/http-status';

// Validate env at module level (P1: Env Validation)
const serverEnv = getServerEnv(process.env);

// --- Environment Validation ---
const CRITICAL_ENVS: (keyof typeof serverEnv)[] = ['DATABASE_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const missingEnvs = CRITICAL_ENVS.filter(key => !serverEnv[key]);

if (missingEnvs.length > 0) {
    logger.error(`❌ [CRITICAL] Missing essential environment variables: ${missingEnvs.join(', ')}`);
    if (process.env.NODE_ENV === 'production') {
        // In production, we should potentially fail fast, but for now we log error loudly
    }
} else {
    logger.info('✅ [INIT] Core environment variables validated.');
}

export type Env = {
    Variables: {
        requestId: string;
        user?: { id: string; email?: string };
        userId?: string;
    }
}

const apiApp = new Hono<Env>();

import { errorFactory } from './_lib/error/factory.js';

// ✅ 統一錯誤處理
apiApp.onError((err, c) => {
    const requestId = c.get('requestId') || 'unknown';
    logger.error(`[API Error] ${c.req.method} ${c.req.path}`, err);
    
    // 如果錯誤已經是 AppError，直接返回
    if (err instanceof AppError) {
        err.traceId = typeof requestId === 'string' ? requestId : 'unknown';
        return c.json(errorFactory.fail(err), (err.statusCode as ContentfulStatusCode) || 500);
    }

    // 处理 HTTPException
    if (err instanceof HTTPException) {
        return c.json(errorFactory.fail(errorFactory.create({
            message: err.message,
            status: err.status,
            code: 'HTTP_EXCEPTION'
        })), err.status as ContentfulStatusCode);
    }

    const appErr = errorFactory.wrap(err, `api.${c.req.method.toLowerCase()}.${c.req.path.replace(/\//g, '_')}`);
    appErr.traceId = typeof requestId === 'string' ? requestId : 'unknown';
    
    return c.json(errorFactory.fail(appErr), (appErr.statusCode as ContentfulStatusCode) || 500);
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

// ✅ 統一 404 路由不存在處理 (必須放在所有路由定義之後)
apiApp.notFound((c) => {
    const { method, path, url } = c.req;
    logger.warn(`[API 404] Route Not Found: [${method}] ${path} (Full URL: ${url})`);
    const err = new Error(`API 路由不存在 (Route Not Found): [${method}] ${path}`);
    return errorResponse(c, err, 404);
});

export const app = new Hono().route('/api', routes);

export type AppType = typeof app;
