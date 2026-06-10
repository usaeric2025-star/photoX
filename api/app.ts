import { Hono } from "hono";
import { cors } from "hono/cors";
import { getServerEnv } from "./_shared/envSchema.js";
import { logTraffic } from "./_lib/trafficCapture.js";
import { requireRealUser } from "./_lib/auth.js";
import { getSupabaseAdmin } from "./_lib/supabase.js";
import adminApp from "./_admin.js";
import { ai } from "./_handlers/ai.js";
import { tags } from "./_handlers/tags.js";
import { storage } from "./_handlers/storage.js";
import { getTraceId } from "./_lib/error/traceId.js";
import { logger } from "./_lib/logger.js";
import { AppError, errorFactory } from "./_lib/error/AppError.js";

// Validate env at module level
const serverEnv = getServerEnv(process.env);

export const app = new Hono().basePath("/api");

// --- Middleware ---
app.use("*", cors());
app.use("*", async (c, next) => {
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

  // 返回標準 AppResult（body 不含 traceId）
  const status = (err as any).status || 500
  return c.json(errorFactory.fail(appError), status)
})

// Auth Middleware for Administrative Routes
app.use("/admin/*", async (c, next) => {
    // Whitelist public-accessible admin routes
    if (c.req.path.endsWith('/admin/settings/get-keys')) {
        await next();
        return;
    }

    try {
        await requireRealUser(c);
        await next();
    } catch (e: any) {
        console.error(`[Auth Error] ${c.req.path}: ${e.message}`);
        return c.json({ success: false, error: e.message }, 401);
    }
});

// --- API Routes (Distributed) ---
app.route("/admin", adminApp);
app.route("/ai", ai);
app.route("/tags", tags);
app.route("/", storage);

// --- Global Error Logging ---
app.post("/log-error", async (c) => {
    try {
        const body = (await c.req.json()) as any;
        const supabase = await getSupabaseAdmin();
        const { error } = await supabase.from('system_logs').insert({
            level: body.metadata?.level || 'error',
            message: body.error_message || 'Unknown error',
            stack: body.stack_trace,
            trace_id: getTraceId(c),
            metadata: {
              ...body.metadata,
              url: body.url,
            }
        });
        if (error) throw error;
        return c.json({ success: true });
    } catch (e: any) {
        console.error('[Logger API] Failed to store log:', e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

// --- Core Utility Routes ---
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
