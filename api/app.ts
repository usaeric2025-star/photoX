import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getServerEnv } from './_shared/envSchema.js';
import adminApp from './_admin.js';
import { publicSettings } from './_handlers/public_settings.js';
import { ai } from './_handlers/ai.js';
import { tags } from './_handlers/tags.js';
import { categories } from './_handlers/categories.js';
import { manufacturers } from './_handlers/manufacturers.js';
import { groups } from './_handlers/groups.js';
import { photos } from './_handlers/photos/index.js';
import { storage } from './_handlers/storage.js';
import { storageMaintenance } from './_handlers/admin/storageMaintenance.js';
import * as Sentry from '@sentry/node';
import { setupMiddlewares } from './_lib/middleware.js';

// Validate env at module level
const serverEnv = getServerEnv(process.env);

// Initialize Sentry on backend if DSN present
const sentryDsn = serverEnv.SENTRY_DSN || serverEnv.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: serverEnv.NODE_ENV || 'development',
    tracesSampleRate: serverEnv.NODE_ENV === 'production' ? 0.1 : 1.0,
    initialScope: {
      tags: {
        app: 'photox-backend',
        platform: 'node',
      }
    }
  });
}

export const app = new Hono().basePath('/api');

app.use('*', cors());
app.get('/health', (c) => c.json({ success: true, status: 'ok' }));
setupMiddlewares(app, serverEnv, sentryDsn);

// --- Global Error Logging ---
app.onError(async (err, c) => {
    const { db, systemLogs } = await import('./_lib/db/index.js');
    const { logger } = await import('./_lib/logger.js');
    const traceId = c.req.header('X-Trace-Id') || 'be-' + Math.random().toString(36).substring(2, 12);
    
    logger.error(`[Global Backend Error] ${err.message}`, { 
        url: c.req.url, 
        method: c.req.method,
        traceId,
        stack: err.stack 
    });

    try {
        await (db as any).insert(systemLogs).values({
            message: err.message || 'Unknown error',
            level: 'error',
            operation: `internal.${c.req.path}`,
            module: 'backend',
            traceId,
            resource: c.req.url,
            metadata: {
                stack: err.stack,
                url: c.req.url,
                method: c.req.method,
                params: c.req.param(),
                query: c.req.query(),
                timestamp: new Date().toISOString()
            },
            createdAt: new Date()
        });
    } catch (dbErr) {
        logger.error('[Fatal] Failed to log error to database:', dbErr);
    }

    return c.json({ 
        success: false, 
        error: err.message || 'Internal Server Error',
        traceId 
    }, 500);
});

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
app.route('/', storageMaintenance);

// --- Persistent Logging Route ---
app.post('/log-error', async (c) => {
    try {
        const body = await c.req.json();
        const traceId = c.req.header('X-Trace-Id') || 'backend-' + Math.random().toString(36).substring(2, 12);
        
        const { db, systemLogs } = await import('./_lib/db/index.js');
        const { logger } = await import('./_lib/logger.js');
        
        const level = body.level === 'warn' ? 'warn' : 'error';
        const operation = body.module || 'client.error';
        const msg = typeof body.message === 'string' ? body.message : JSON.stringify(body);
        
        await (db as any).insert(systemLogs).values({
            message: msg,
            level,
            operation,
            traceId,
            resource: body.url || null,
            metadata: {
                ...body,
                traceId,
                timestamp: new Date().toISOString()
            },
            createdAt: new Date()
        });
        
        logger.info(`[Remote Log] saved from client via /log-error`, { traceId, operation });
        return c.json({ success: true, traceId });
    } catch (e) {
        console.error('[log-error] Failed to persist log:', e);
        return c.json({ success: false, error: 'Database error' }, 500);
    }
});

// Admin error events list
app.get('/admin/error-events', async (c) => {
  try {
      // Inline auth to prevent circular dep in app.ts
      const { requireRealUser } = await import('./_lib/auth.js');
      await requireRealUser(c);

      const limit = parseInt(c.req.query('limit') || '100', 10);
      const page = parseInt(c.req.query('page') || '0', 10);
      
      const { db, systemLogs } = await import('./_lib/db/index.js');
      const { desc } = await import('drizzle-orm');

      const data = await db.query.systemLogs.findMany({
          orderBy: [desc(systemLogs.createdAt)],
          limit: limit,
          offset: page * limit
      });

      return c.json({ success: true, data });
  } catch (e: any) {
      if (e.message?.includes('Unauthorized')) {
          return c.json({ success: false, error: 'Unauthorized' }, 401);
      }
      return c.json({ success: false, error: e.message }, 500);
  }
});

// Clear all error events
app.post('/admin/error-events/clear', async (c) => {
  try {
      const { requireRealUser } = await import('./_lib/auth.js');
      await requireRealUser(c);

      const { db, systemLogs } = await import('./_lib/db/index.js');
      await db.delete(systemLogs);

      return c.json({ success: true });
  } catch (e: any) {
      if (e.message?.includes('Unauthorized')) {
          return c.json({ success: false, error: 'Unauthorized' }, 401);
      }
      return c.json({ success: false, error: e.message }, 500);
  }
});

app.post('/admin/system-logs/delete-logs-batch', async (c) => {
    return c.json({ success: false, error: 'Cannot delete logs from R2 via this endpoint anymore.' }, 400);
});

export type AppType = typeof app;
