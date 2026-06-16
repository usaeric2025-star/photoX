import { Hono } from "hono";
import { cors } from "hono/cors";
import { getServerEnv } from "./_shared/envSchema.js";
import { logTraffic } from "./_lib/trafficCapture.js";
import { requireRealUser } from "./_lib/auth.js";
import { getSupabaseAdmin } from "./_lib/supabase.js";
import adminApp from "./_admin.js";
import { ai } from "./_handlers/ai.js";
import { tags } from "./_handlers/tags.js";
import { search } from "./_handlers/search.js";
import { categories } from "./_handlers/categories.js";
import { groups } from "./_handlers/groups.js";
import { photos } from "./_handlers/photos/index.js";
import { storage } from "./_handlers/storage.js";
import { storageMaintenance } from "./_handlers/admin/storageMaintenance.js";
import { getTraceId } from "./_lib/error/traceId.js";
import { logger } from "./_lib/logger.js";
import { AppError, errorFactory } from "./_lib/error/AppError.js";

// Validate env at module level
const serverEnv = getServerEnv(process.env);

export const app = new Hono().basePath("/api");

// --- Middleware ---
app.use("*", cors());
app.use("*", async (c, next) => {
    const traceId = getTraceId(c);
    c.header('X-Trace-Id', traceId);
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
  const traceId = getTraceId(c)

  // 轉換為標準 AppError
  const appError = err instanceof AppError 
    ? err 
    : errorFactory.wrap(err, `api.${c.req.path}`, 'HANDLER_ERROR')
  appError.traceId = traceId

  // 後端日誌記錄
  logger.error('api.error', {
    traceId,
    path: c.req.path,
    method: c.req.method,
    code: appError.code,
    message: appError.message,
    stack: appError.stack,
  })

  // [2026-06-11] 增加持久化日誌到 DB，方便管理後台查看
  try {
    getSupabaseAdmin().then(supabase => {
       supabase.from('system_logs').insert([{
          error_message: `[API ERROR] ${appError.message}`,
          stack_trace: appError.stack,
          url: c.req.path,
          context: 'Backend_API',
          metadata: {
            traceId,
            method: c.req.method,
            code: appError.code,
            level: 'error',
            timestamp: new Date().toISOString()
          },
          created_at: new Date().toISOString()
       }]).then(({ error: insertError }: { error: unknown }) => {
          if (insertError) console.error('[Fatal] Logging to system_logs failed:', insertError);
       });
    }).catch(e => {
       console.error('[Fatal] Failed to get supabase for logging:', e);
    });
  } catch (logErr) {
    console.error('[Fatal] Async logging logic failed:', logErr);
  }

  // 返回標準 AppResult（body 不含 traceId）
  const status = (err as { status?: number }).status || 500
  return c.json(errorFactory.fail(appError), status as any)
})

// Auth Middleware for Administrative Routes
app.use("/admin/*", async (c, next) => {
    // Whitelist public-accessible admin routes
    const path = c.req.path;
    if (path.includes('/admin/settings/get-keys')) {
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


// --- API Routes (Distributed) ---
app.route("/admin", adminApp);
app.route("/ai", ai);
app.route("/tags", tags);
app.route("/categories", categories);
app.route("/groups", groups);
app.route("/photos", photos);
app.route("/search", search);
app.route("/", storage);
app.route("/", storageMaintenance);

// --- Persistent Logging Route ---
app.post("/log-error", async (c) => {
    try {
        const body = await c.req.json();
        const traceId = c.req.header('X-Trace-Id') || 'backend-' + Math.random().toString(36).substring(2, 12);
        
        // Dynamic import to prevent circular dependency issues if any
        const { getSupabaseAdmin } = await import("./_lib/supabase.js");
        const { logger } = await import("./_lib/logger.js");
        
        const supabase = await getSupabaseAdmin();
        
        const { error } = await supabase.from('system_logs').insert([{
            error_message: body.message || body.error_message || 'Unknown Frontend Error',
            stack_trace: body.stack || body.stack_trace || null,
            url: body.url || c.req.header('Referer') || null,
            context: body.name || body.context || 'Frontend_Client',
            metadata: {
                ...(body.context || body.metadata || {}),
                traceId: body.traceId || traceId,
                userAgent: c.req.header('User-Agent'),
                timestamp: new Date().toISOString()
            },
            created_at: body.timestamp || new Date().toISOString()
        }]);

        if (error) {
            console.error('[log-error] Database insert failed:', error);
            return c.json({ success: false, error: 'Failed to persist log' }, 500 as any);
        }

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
