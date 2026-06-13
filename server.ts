import "dotenv/config";
import path from "path";
import fs from "fs";
import { serve } from "@hono/node-server";
import { app } from "./api/app.js";
import { getServerEnv } from "./api/_shared/envSchema.js";

// 启动校验
const serverEnv = getServerEnv(process.env);

// --- Server Startup ---
const PORT = 3000;

async function bootstrap() {
  const isProd = serverEnv.NODE_ENV === "production";
  
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    const { createServer } = await import("http");
    const { getRequestListener } = await import("@hono/node-server");
    const honoListener = getRequestListener(app.fetch);

    const server = createServer(async (req, res) => {
      if (req.url?.startsWith("/api/")) {
        try {
          return honoListener(req, res);
        } catch (err) {
          console.error("Hono error:", err);
          res.statusCode = 500;
          return res.end("Internal Server Error");
        }
      }

      // Delegate to Vite middleware (Connect style)
      vite.middlewares(req, res, () => {
        // Fallback to index.html for SPA during dev
        fs.readFile(path.resolve(process.cwd(), "index.html"), "utf-8", (err, html) => {
          if (err) {
            res.statusCode = 500;
            return res.end("Error loading index.html");
          }
          res.setHeader("Content-Type", "text/html");
          res.end(html);
        });
      });
    });

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`>>> [STARTUP] Hono + Vite (Dev) listening on 0.0.0.0:${PORT}`);
      // [DEV-BRIDGE-PREWARMED] v2.11.1
      fetch(`http://127.0.0.1:${PORT}/api/health`)
        .then(async (r) => {
          const data = await r.json();
          console.log('>>> [PREWARM] Dev Bridge Ready:', data);
        })
        .catch((err) => {
          console.error('>>> [PREWARM] Dev Bridge Failed:', err.message);
        });
    });
  } else {
    // Production Mode (Standard Node)
    const distPath = path.resolve(process.cwd(), "dist");
    
    serve({
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
}

export { app };
