import { Hono } from "hono";
import { cors } from "hono/cors";
import { getServerEnv } from "./_shared/envSchema.js";
import { logTraffic } from "./_lib/trafficCapture.js";
import { requireRealUser } from "./_lib/auth.js";
import { getSupabaseAdmin } from "./_lib/supabase.js";
import { refreshPhotosView } from "./_lib/db/index.js";
import adminApp from "./_admin.js";
import { publicSettings } from "./_handlers/public_settings.js";
import { ai } from "./_handlers/ai.js";
import { tags } from "./_handlers/tags.js";
import { categories } from "./_handlers/categories.js";
import { manufacturers } from "./_handlers/manufacturers.js";
import { groups } from "./_handlers/groups.js";
import { photos } from "./_handlers/photos/index.js";
import { storage } from "./_handlers/storage.js";
import { storageMaintenance } from "./_handlers/admin/storageMaintenance.js";
import { getTraceId } from "./_lib/error/traceId.js";
import { logger } from "./_lib/logger.js";
import { AppError, errorFactory } from "./_lib/error/AppError.js";
import * as Sentry from "@sentry/node";

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
        app: "photox-backend",
        platform: "node",
      }
    }
  });
}

export const app = new Hono().basePath("/api");

// --- Middleware ---
app.use("*", cors());
app.use("*", async (c, next) => {
    const traceId = getTraceId(c);
    c.header('X-Trace-Id', traceId);
    logger.info(`[HTTP] ${c.req.method} ${c.req.path}`, { traceId });
    // 1% sample rate for production, 100% for dev
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

  // Transform to standard AppError
  const appError = err instanceof AppError 
    ? err 
    : errorFactory.wrap(err, `api.${path}`, 'HANDLER_ERROR');
  appError.traceId = traceId;

  // Report to Sentry if initialized
  if (sentryDsn) {
    Sentry.captureException(err, {
      tags: {
        traceId,
        path,
        method,
        code: appError.code,
      },
      extra: {
        appError: {
          code: appError.code,
          status: appError.status,
          message: appError.message,
          stack: appError.stack,
          traceId: appError.traceId,
        },
      }
    });
  }

  // Backend Console Logging
  logger.error('api.error', {
    traceId,
    path,
    method,
    code: appError.code,
    message: appError.message,
    stack: appError.stack,
  });

  // Persistent Logging to DB
  (async () => {
    try {
      const { db, systemLogs } = await import('./_lib/db/index.js');
      await db.insert(systemLogs).values({
        message: `[API ERROR] ${appError.message}`,
        level: 'error',
        operation: `api.${path}`,
        metadata: {
          traceId,
          method,
          code: appError.code,
          stack: appError.stack,
          timestamp: new Date().toISOString()
        },
        createdAt: new Date()
      });
      logger.info(`[API ERROR LOG] Successfully saved to system_logs`);
    } catch (logErr) {
      console.error('[log-error] Fatal exception in logger:', logErr);
    }
  })();

  // Return standard AppResult
  const status = (err as { status?: number }).status || 500;
  return c.json(errorFactory.fail(appError), status as any);
});

// Auth Middleware for Administrative Routes
app.use("/admin/*", async (c, next) => {
    // Whitelist public-accessible admin routes
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
        const appErr = errorFactory.create({
            code: 'UNAUTHORIZED',
            message: errorMessage,
            operation: `api.auth.${c.req.path}`
        });
        appErr.traceId = traceId;
        return c.json(errorFactory.fail(appErr), 401 as any);
    }
});

// Protect all mutation endpoints (non-GET) that are not under /admin
app.use("*", async (c, next) => {
    const method = c.req.method;
    const path = c.req.path;
    
    // We only protect specific mutable routes explicitly if they are not already protected
    const isMutation = ["POST", "PUT", "DELETE"].includes(method);
    
    // We outline exact POST queries to be treated as reads
    const postQueries = [
        '/list', '/list-by-group', '/list-by-group-paginated', 
        '/count', '/by-ids', '/without-thumb-hash', '/check-hash',
        '/group-photos'
    ];
    const isPostQuery = postQueries.some(q => path.endsWith(q));

    const isAiFeature = path.startsWith('/api/ai');
    const isStorageMutation = path.startsWith('/api/upload') || path.startsWith('/api/r2');
    
    // Protect anything that is an AI call, a Storage mutation, or a general resource mutation (non-query)
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
             const appErr = errorFactory.create({
                 code: 'UNAUTHORIZED',
                 message: errorMessage,
                 operation: `api.auth_mutation.${c.req.path}`
             });
             appErr.traceId = traceId;
             return c.json(errorFactory.fail(appErr), 401 as any);
        }
    }
    
    await next();
});


// --- Materialized View Refresh Middleware (CQRS) ---
app.use("*", async (c, next) => {
    await next();
    
    // Only refresh on successful mutations to core data entities
    const method = c.req.method;
    const path = c.req.path;
    const isMutation = ["POST", "PUT", "DELETE"].includes(method);
    const isSuccess = c.res.status >= 200 && c.res.status < 300;
    
    if (isMutation && isSuccess) {
        const affectedPrefixes = ['/api/photos', '/api/groups', '/api/categories', '/api/tags'];
        const isAffectedPath = affectedPrefixes.some(prefix => path.startsWith(prefix));
        
        // Exclude RPC-style queries that use POST
        const querySuffixes = ['/list', '/count', '/by-ids', '/check-hash', '/group-photos'];
        const isQuery = querySuffixes.some(suffix => path.endsWith(suffix));
        
        if (isAffectedPath && !isQuery) {
            // Background refresh (non-blocking)
            refreshPhotosView().catch(err => {
                logger.error('[Refresh Middleware] Failure', { path, method, error: err.message });
            });
        }
    }
});


// --- API Routes (Distributed) ---
app.route("/admin", adminApp);
app.route("/public/settings", publicSettings);
app.route("/ai", ai);
app.route("/tags", tags);
app.route("/categories", categories);
app.route("/manufacturers", manufacturers);
app.route("/groups", groups);
app.route("/photos", photos);
app.route("/", storage);
app.route("/", storageMaintenance);

// --- Persistent Logging Route ---
app.post("/log-error", async (c) => {
    try {
        const body = await c.req.json();
        const traceId = c.req.header('X-Trace-Id') || 'backend-' + Math.random().toString(36).substring(2, 12);
        
        const { db, systemLogs } = await import('./_lib/db/index.js');
        const { logger } = await import("./_lib/logger.js");
        
        const errorMessage = body.message || body.error_message || 'Unknown Frontend Error';
        const stackTrace = body.stack || body.stack_trace || null;

        // Proxy/Report to Sentry via server context
        if (sentryDsn) {
            const fakeError = new Error(errorMessage);
            fakeError.stack = stackTrace || undefined;
            Sentry.captureException(fakeError, {
                tags: {
                    source: 'frontend_proxied',
                    traceId: body.traceId || traceId,
                    component: body.name || body.context || 'Frontend_Client',
                    kind: body.metadata?.kind || 'UNKNOWN',
                },
                extra: {
                    frontend_metadata: body.metadata || {},
                    url: body.url || c.req.header('Referer') || null,
                }
            });
        }
        
        await db.insert(systemLogs).values({
            message: errorMessage,
            level: 'error',
            operation: body.context || 'Frontend_Client',
            resource: body.url || c.req.header('Referer') || null,
            traceId: body.traceId || traceId,
            metadata: {
                ...(body.metadata || {}),
                traceId: body.traceId || traceId,
                userAgent: c.req.header('User-Agent'),
                stack: stackTrace,
                timestamp: new Date().toISOString()
            },
            createdAt: body.timestamp ? new Date(body.timestamp) : new Date()
        });

        return c.json({ success: true });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[log-error] Request parsing failed:', err);
        return c.json({ success: false, error: message }, 400);
    }
});

// --- Core Utility Routes ---
app.get("/download", async (c) => {
    const url = c.req.query("url");
    let filename = c.req.query("filename") || "photo";
    
    if (!url) {
        return c.text("Missing url parameter", 400);
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return c.text(`Failed to fetch file: ${response.statusText}`, response.status as any);
        }
        
        const contentType = response.headers.get("content-type") || "image/jpeg";
        if (!filename.includes(".")) {
            const ext = contentType.split("/")[1] || "jpeg";
            filename = `${filename}.${ext}`;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        c.header("Content-Type", contentType);
        c.header("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
        return c.body(arrayBuffer);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown download error';
        logger.error("api.download.error", { url, filename, error: errorMessage });
        return c.text(`Download proxy error: ${errorMessage}`, 500);
    }
});

app.get("/health", (c) => {
    return c.json({ 
        success: true, 
        data: { 
            status: "ok", 
            uptime: process.uptime(), 
            timestamp: Date.now(),
            version: "1.2.0-modular"
        } 
    });
});

export type AppType = typeof app;
