import { Hono } from 'hono';
import { requireRealUser } from './auth.js';
import { logTraffic } from './trafficCapture.js';
import { refreshPhotosView } from './db/index.js';
import { getTraceId } from './error/traceId.js';
import { logger } from './logger.js';
import { AppError, errorFactory } from './error/AppError.js';
import * as Sentry from '@sentry/node';

export function setupMiddlewares(app: Hono, serverEnv: any, sentryDsn?: string) {
  // --- Middleware ---
  app.use('*', async (c, next) => {
      const traceId = getTraceId(c);
      c.header('X-Trace-Id', traceId);
      logger.info(`[HTTP] ${c.req.method} ${c.req.path}`, { traceId });
      if (serverEnv.NODE_ENV === 'production') {
          if (Math.random() < 0.01) logTraffic(c.req, null);
      } else {
          logTraffic(c.req, null);
      }
      await next();
  });

  // Global Exception Handler
  app.onError((err, c) => {
    const traceId = getTraceId(c);
    const path = c.req.path;
    const method = c.req.method;
  
    const appError = err instanceof AppError 
      ? err 
      : errorFactory.wrap(err, `api.${path}`, 'HANDLER_ERROR');
    appError.traceId = traceId;
  
    if (sentryDsn) {
      Sentry.captureException(err, {
        tags: { traceId, path, method, code: appError.code },
        extra: { appError: { code: appError.code, status: appError.status, message: appError.message, stack: appError.stack, traceId: appError.traceId } }
      });
    }
  
    logger.error('api.error', { traceId, path, method, code: appError.code, message: appError.message, stack: appError.stack });
  
    (async () => {
      try {
        const { db, systemLogs } = await import('./db/index.js');
        await db.insert(systemLogs).values({
          message: `[API ERROR] ${appError.message}`,
          level: 'error',
          operation: `api.${path}`,
          metadata: { traceId, method, code: appError.code, stack: appError.stack, timestamp: new Date().toISOString() },
          createdAt: new Date()
        });
        logger.info(`[API ERROR LOG] Successfully saved to system_logs`);
      } catch (logErr) {
        console.error('[log-error] Fatal exception in logger:', logErr);
      }
    })();
  
    const status = (err as { status?: number }).status || 500;
    return c.json(errorFactory.fail(appError), status as any);
  });

  // Auth Middleware for Administrative Routes
  app.use('/admin/*', async (c, next) => {
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
          return c.json(errorFactory.fail(appErr), 401 as any);
      }
  });

  // Protect all mutation endpoints (non-GET) that are not under /admin
  app.use('*', async (c, next) => {
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
               return c.json(errorFactory.fail(appErr), 401 as any);
          }
      }
      await next();
  });

  // --- Materialized View Refresh Middleware (CQRS) ---
  app.use('*', async (c, next) => {
      await next();
      const method = c.req.method;
      const path = c.req.path;
      const isMutation = ['POST', 'PUT', 'DELETE'].includes(method);
      const isSuccess = c.res.status >= 200 && c.res.status < 300;
      if (isMutation && isSuccess) {
          const affectedPrefixes = ['/api/photos', '/api/groups', '/api/categories', '/api/tags'];
          const isAffectedPath = affectedPrefixes.some(prefix => path.startsWith(prefix));
          const querySuffixes = ['/list', '/count', '/by-ids', '/check-hash'];
          const isQuery = querySuffixes.some(suffix => path.endsWith(suffix));
          if (isAffectedPath && !isQuery) {
              refreshPhotosView().catch(err => {
                  logger.error('[Refresh Middleware] Failure', { path, method, error: err.message });
              });
          }
      }
  });
}
