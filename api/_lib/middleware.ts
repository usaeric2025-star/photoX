import { Hono, type Next } from 'hono';
import { type Env } from '../_app.js';
import { type StatusCode } from 'hono/utils/http-status';
import { timeout } from 'hono/timeout';
import { HTTPException } from 'hono/http-exception';
import { requireRealUser } from './auth.js';
import { getTraceId } from './error/traceId.js';
import { logger, logContext } from './logger.js';
import { AppError } from '../../shared/AppError.js';
import { errorFactory } from './error/factory.js';

export function setupMiddlewares(app: Hono<Env>, serverEnv: { NODE_ENV: string | undefined }) {
  // --- Global Lifecycle Middleware (Tracing, Logging, Timeouts, Cache Control) ---
  app.use('*', async (c, next) => {
    const traceId = getTraceId(c);
    c.header('X-Trace-Id', traceId);
    c.set('requestId', traceId);
    
    return logContext.run({ requestId: traceId }, async () => {
        const path = c.req.path;
        const method = c.req.method;

        // 1. Determine Timeout Duration
        let duration = 30000;
        if (path.includes('/ai') || path.includes('/groups') || path.includes('/photos') || path.includes('/admin')) duration = 120000;
        else if (path.includes('/upload') || path.includes('/storage') || path.includes('/batch') || path.includes('/refresh-view')) {
          duration = 120000;
        }

        const timeoutHandler = timeout(duration, () => {
          logger.warn(`Request Timeout triggered for ${method} ${path} after ${duration}ms`);
          return new HTTPException(504, { message: `Request Timeout after ${duration}ms` });
        });

        // 2. Logging
        if (method !== 'GET' || serverEnv.NODE_ENV === 'development') {
            logger.info(`[HTTP] ${method} ${path}`);
        }

        // 3. Execution
        const response = await timeoutHandler(c, next);

        // 4. Post-execution Cache Control Logic
        if (method === 'GET') {
          const isAdminMode = c.req.query('isAdminMode') === 'true';
          const referer = c.req.header('referer') || '';
          const isAdminPath = referer.includes('/admin') || path.startsWith('/api/admin') || isAdminMode;

          const isListPath = 
            path === '/api/tags' || path === '/api/tags/' ||
            path === '/api/categories' || path === '/api/categories/' ||
            path === '/api/manufacturers' || path === '/api/manufacturers/' ||
            path === '/api/groups' || path === '/api/groups/';

          if (isAdminPath) {
            c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          } else if (isListPath) {
            c.header('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');
          } else if (path.startsWith('/api/public/settings') || path.startsWith('/api/system/health')) {
            c.header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
          }
        } else if (method === 'POST') {
          if (path.endsWith('/list') || path.endsWith('/list-by-group') || path.endsWith('/list-by-group-paginated')) {
              const referer = c.req.header('referer') || '';
              const isAdminPath = referer.includes('/admin') || path.startsWith('/api/admin');
              
              if (isAdminPath) {
                  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
              } else {
                  c.header('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30');
                  c.header('Vercel-CDN-Cache-Control', 'max-age=15, stale-while-revalidate=30');
              }
          }
        }

        return response;
    });
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
          return c.json(errorFactory.fail(appErr), 401);
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
               return c.json(errorFactory.fail(appErr), 401);
          }
      }
      await next();
  });
}
