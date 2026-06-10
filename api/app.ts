import { Hono } from "hono";
import { cors } from "hono/cors";
import { getServerEnv } from "./_shared/envSchema";
import { logTraffic } from "./_lib/trafficCapture";
import { requireRealUser } from "./_lib/auth";
import { getSupabaseAdmin } from "./_lib/supabase";
import adminApp from "./admin";
import { ai } from "./_handlers/ai";
import { tags } from "./_handlers/tags";
import { storage } from "./_handlers/storage";
import { getTraceId } from "./_lib/error/traceId";
import { logger } from "./_lib/logger";
import { AppError, errorFactory } from "./_lib/error/AppError";

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
