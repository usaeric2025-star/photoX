import "dotenv/config";
import path from "path";
import fs from "fs";
import { serve } from "@hono/node-server";
import { app } from "./api/_app.js";
import { getServerEnv } from "./shared/envSchema.js";

// 启动校验
const serverEnv = getServerEnv(process.env);

// Global Error Handlers to prevent server crashes from unhandled promise rejections (e.g., DB timeouts)
process.on('unhandledRejection', (reason, promise) => {
  console.error('>>> [CRITICAL-SAFEGUARD] Unhandled Promise Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('>>> [CRITICAL-SAFEGUARD] Uncaught Exception:', err);
});

// --- Server Startup ---
const PORT = 3000;

async function bootstrap() {
  const isProd = serverEnv.NODE_ENV === "production";
  console.log(`>>> [BOOTSTRAP] Starting server. Mode: ${isProd ? 'Production' : 'Development'}`);
  
  if (!isProd) {
    // Dev view check
    try {
      const { ensureViewExists } = await import("./api/_lib/db/actions.js");
      await ensureViewExists();
    } catch (viewErr) {
      console.warn(">>> [STARTUP] Initial view check failed (ignoring for dev):", viewErr);
    }

    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    const { createServer } = await import("http");
    const { getRequestListener } = await import("@hono/node-server");
    const honoListener = getRequestListener(app.fetch);

    const server = createServer(async (req, res) => {
      const isApiRequest = req.url?.startsWith("/api/") && !req.url.startsWith("/api/_shared");
      if (isApiRequest) {
        try {
          return honoListener(req, res);
        } catch (err) {
          console.error("Hono error:", err);
          res.statusCode = 500;
          return res.end("Internal Server Error");
        }
      }

      // SPA routing fallback: rewrite sub-routes (e.g., /admin) to /index.html so Vite middleware compiles the entry point correctly
      if (req.url && !req.url.startsWith("/api") && !req.url.includes(".")) {
        req.url = "/index.html";
      }

      // Delegate to Vite middleware (Connect style)
      vite.middlewares(req, res, async () => {
        // Fallback to index.html for SPA during dev
        try {
          const rawHtml = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
          const html = await vite.transformIndexHtml(req.url || "/", rawHtml);
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html");
          res.end(html);
        } catch (err: any) {
          console.error("Vite index.html transform error:", err);
          res.statusCode = 500;
          res.end("Error loading index.html: " + (err.message || String(err)));
        }
      });
    });

    const serverInstance = server.listen(PORT, "0.0.0.0", () => {
      console.log(`>>> [STARTUP] Hono + Vite (Dev) listening on 0.0.0.0:${PORT}`);
      // [DEV-BRIDGE-PREWARMED] v2.11.1
      // Use setTimeout to ensure the server event loop has spun up
      setTimeout(() => {
        fetch(`http://127.0.0.1:${PORT}/api/system/health`)
          .then(async (r) => {
            const text = await r.text();
            if (!r.ok) {
              console.error(`>>> [PREWARM] Dev Bridge HTTP Error ${r.status}:`, text);
              return;
            }
            try {
              const data = JSON.parse(text);
              console.log('>>> [PREWARM] Dev Bridge Ready:', data);
            } catch (err: any) {
              console.error('>>> [PREWARM] Dev Bridge Failed to parse JSON:', err.message, 'Raw response:', text);
            }
          })
          .catch((err) => {
            console.error('>>> [PREWARM] Dev Bridge Fetch Failed:', err.message);
          });
      }, 500);
    });

    // Graceful Shutdown
    const shutdown = () => {
      console.log(">>> [SHUTDOWN] Closing dev server...");
      serverInstance.close(() => {
        console.log(">>> [SHUTDOWN] Server closed successfully.");
        process.exit(0);
      });
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } else {
    // Production Mode (Standard Node)
    const distPath = path.resolve(process.cwd(), "dist");
    
    // Production view check
    try {
       const { ensureViewExists } = await import("./api/_lib/db/actions.js");
       await ensureViewExists();
    } catch (viewErr) {
       console.error(">>> [STARTUP] Critical view check failed in production:", viewErr);
    }

    const serverInstance = serve({
      fetch: (req) => {
        const url = new URL(req.url);
        if (url.pathname.startsWith("/api/")) {
          return app.fetch(req);
        }
        
        // Serve static files from dist
        const filePath = path.join(distPath, url.pathname === "/" ? "index.html" : url.pathname);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
           const content = fs.readFileSync(filePath);
           const ext = path.extname(filePath);
           const contentType = {
             '.html': 'text/html',
             '.js': 'application/javascript',
             '.css': 'text/css',
             '.png': 'image/png',
             '.jpg': 'image/jpeg',
             '.svg': 'image/svg+xml',
             '.webp': 'image/webp'
           }[ext] || 'application/octet-stream';
           return new Response(content, { headers: { "Content-Type": contentType } });
        }
        
        // Fallback to index.html for SPA
        const indexHtml = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
        return new Response(indexHtml, { headers: { "Content-Type": "text/html" } });
      },
      port: PORT,
    });
    
    // Graceful Shutdown
    const shutdown = () => {
      console.log(">>> [SHUTDOWN] Closing production server...");
      serverInstance.close(() => {
        console.log(">>> [SHUTDOWN] Server closed successfully.");
        process.exit(0);
      });
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }

  console.log(`>>> Hono Server listening on 0.0.0.0:${PORT}`);
}

const isVercelEnvironment = typeof process !== "undefined" && (
  process.env.VERCEL === "1" || 
  process.env.NOW_BUILDER !== undefined || 
  process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined
);

if (!isVercelEnvironment) {
  bootstrap().catch(err => {
    console.error("CRITICAL: Bootstrap failed", err);
  });
} else {
  console.log(">>> [SERVER-MODE] Detected Serverless/Vercel Environment. Skipping bootstrap.");
}

export { app };
