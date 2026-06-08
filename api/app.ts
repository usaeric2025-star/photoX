import { Hono } from "hono";
import { cors } from "hono/cors";
import { getServerEnv } from "./shared/envSchema.js";
import { logTraffic } from "./lib/trafficCapture.js";
import { requireRealUser } from "./lib/auth.js";
import { getSupabaseAdmin } from "./lib/supabase.js";
import { admin } from "./handlers/admin/index.js";
import { ai } from "./handlers/ai.js";
import { storage } from "./handlers/storage.js";

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
  const status = (err as any).status || 500;
  console.error(`[API Error] ${c.req.method} ${c.req.path}: ${err.message}`, err);
  
  return c.json({
    success: false,
    error: {
      message: err.message || "Internal Server Error",
      code: (err as any).code || 'INTERNAL_SERVER_ERROR'
    }
  }, status);
});

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
app.route("/admin", admin);
app.route("/ai", ai);
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
