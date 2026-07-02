import { Hono, type Context } from 'hono';
import { type StatusCode } from 'hono/utils/http-status';
import { requireRealUser } from './auth.js';
import { getTraceId } from './error/traceId.js';
import { logger } from './logger.js';
import { AppError } from '../../shared/AppError.js';
import { errorFactory } from './error/factory.js';

export function setupMiddlewares(app: Hono, serverEnv: { NODE_ENV: string | undefined }) {
  // --- Middleware ---
  app.use('*', async (c: Context, next) => {
      const traceId = getTraceId(c);
      c.header('X-Trace-Id', traceId);
      // 只在非 GET 請求或開發環境執行日誌，減少雜訊
      if (c.req.method !== 'GET' || serverEnv.NODE_ENV === 'development') {
          logger.info(`[HTTP] ${c.req.method} ${c.req.path}`, { traceId });
      }
      
      // 為頻繁讀取的靜態型錄路由加上 Cache-Control
      if (c.req.method === 'GET') {
        const path = c.req.path;
        if (path.startsWith('/api/tags') || 
            path.startsWith('/api/categories') || 
            path.startsWith('/api/manufacturers') || 
            path.startsWith('/api/groups')) {
          // CDN 快取 10 秒，在背景重新驗證 60 秒，減少資料庫壓力
          c.header('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');
        }
      }
      
      await next();
  });

  // Auth Middleware for Administrative Routes
  app.use('/admin/*', async (c: Context, next) => {
      const path = c.req.path;
      if (path.includes('/admin/settings/get-keys') || path.includes('/admin/settings/get')) {
          await next();
          return;
      }
      try {
          await requireRealUser(c);
          await next();
      } catch (e: unknown) {
          const traceId = getTraceId(c);
          const errorMessage = e instanceof Error ? e.message : 'Unauthorized';
          logger.warn(`[Auth Error] ${c.req.path}: ${errorMessage}`, { traceId });
          const appErr = errorFactory.create({ code: 'UNAUTHORIZED', message: errorMessage, operation: `api.auth.${c.req.path}` });
          appErr.traceId = traceId;
          return c.json(errorFactory.fail(appErr), 401);
      }
  });

  // Protect all mutation endpoints (non-GET) that are not under /admin
  app.use('*', async (c: Context, next) => {
      const method = c.req.method;
      const path = c.req.path;
      const isMutation = ['POST', 'PUT', 'DELETE'].includes(method);
      const postQueries = ['/list', '/list-by-group', '/list-by-group-paginated', '/count', '/by-ids', '/without-thumb-hash', '/check-hash', '/group-photos'];
      const isPostQuery = postQueries.some(q => path.endsWith(q));
      const isAiFeature = path.startsWith('/api/ai');
      const isStorageMutation = path.startsWith('/api/upload') || path.startsWith('/api/r2');
      const isProtectedFeature = isAiFeature || isStorageMutation || (isMutation && !isPostQuery && (
                                 path.startsWith('/api/groups') || 
                                 path.startsWith('/api/categories') || 
                                 path.startsWith('/api/tags') ||
                                 path.startsWith('/api/photos')));
      if (isProtectedFeature) {
          try {
              await requireRealUser(c);
          } catch(e: unknown) {
               const traceId = getTraceId(c);
               const errorMessage = e instanceof Error ? e.message : 'Unauthorized (Mutation)';
               logger.warn(`[Auth Error - Mutation] ${c.req.path}: ${errorMessage}`, { traceId });
               const appErr = errorFactory.create({ code: 'UNAUTHORIZED', message: errorMessage, operation: `api.auth_mutation.${c.req.path}` });
               appErr.traceId = traceId;
               return c.json(errorFactory.fail(appErr), 401);
          }
      }
      await next();
  });
}
