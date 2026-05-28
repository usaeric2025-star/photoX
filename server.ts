import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { cors } from "hono/cors";
import path from "path";
import fs from "fs";
import { PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "./src/services/storage/client";
import { getServerEnv } from "./src/shared/envSchema";
import { logTraffic } from "./src/lib/trafficCapture";

// 启动校验
const serverEnv = getServerEnv(process.env);

// --- Hono App Implementation ---
const app = new Hono().basePath("/api");

// Middleware
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
  console.error('[Hono Global Error]', {
    message: err.message,
    stack: err.stack,
    context: c.req.path
  });
  
  // Return StandardError structure
  return c.json({
    success: false,
    error: {
      message: err.message,
      code: 'INTERNAL_SERVER_ERROR'
    }
  }, 500);
});

// --- Supabase Admin Helper ---
async function getSupabaseAdmin() {
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = serverEnv.VITE_SUPABASE_URL || serverEnv.SUPABASE_URL;
  const supabaseKey = serverEnv.SUPABASE_SERVICE_KEY || serverEnv.VITE_SUPABASE_ANON_KEY; 
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials missing");
  }
  return createClient(supabaseUrl, supabaseKey);
}

// --- API Routes ---

const apiRoutes = app
  .post("/upload-presign", async (c) => {
    try {
      const { photoId, contentType } = await c.req.json();
      if (!photoId) return c.json({ error: "photoId required" }, 400);
      
      const fileName = `photox/public/${photoId}.webp`;
      const s3Client = await getR2Client();
      
      const command = new PutObjectCommand({
        Bucket: serverEnv.R2_BUCKET_NAME || 'photox-storage',
        Key: fileName,
        ContentType: contentType || 'image/webp',
      });
      
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
      const publicUrl = `${serverEnv.R2_PUBLIC_URL_PREFIX || 'https://pub-ffc4b0692ab74fabb58cbccc5287d7b1.r2.dev'}/${fileName}`;
      
      return c.json({ success: true, data: { uploadUrl, publicUrl } });
    } catch(e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
  })
  .post("/r2-delete", async (c) => {
    try {
      const { fileKeys } = await c.req.json();
      if (!fileKeys || !Array.isArray(fileKeys)) {
        return c.json({ success: false, error: "fileKeys array required" }, 400);
      }
      
      const s3Client = await getR2Client();
      const bucketName = serverEnv.R2_BUCKET_NAME || 'photox-storage';
      
      await Promise.all(fileKeys.map(async (key) => {
          const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
          });
          return s3Client.send(command);
      }));
      
      return c.json({ success: true });
    } catch(e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
  })
  .get("/photos", async (c) => {
    try {
      const supabase = await getSupabaseAdmin();
      const { data, error } = await supabase.from("furniture_items").select("*").limit(50);
      if (error) throw error;
      
      // Verification anchor for hotfix diagnostic
      const auth = c.req.header('authorization');
      if (!auth) {
        console.warn('[API-SMOKE-WARN] No auth header detected in request');
      }

      return c.json(data);
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
  })
  .get("/health", (c) => {
    return c.json({ success: true, data: { status: "ok", uptime: process.uptime(), timestamp: Date.now() } });
  })
  .get("/storage/audit", async (c) => {
    try {
      const supabase = await getSupabaseAdmin();
      const s3Client = await getR2Client();
      const bucket = serverEnv.R2_BUCKET_NAME || 'photox-storage';

      const { data: photos, error } = await supabase.from("furniture_items").select("id, image_url, thumb_url");
      if (error) throw error;

      const r2Files: Set<string> = new Set();
      const dbFiles: Set<string> = new Set();

      photos.forEach(p => {
        if (p.image_url?.includes("r2")) dbFiles.add(p.image_url.split("/").pop()!);
        if (p.thumb_url?.includes("r2")) dbFiles.add(p.thumb_url.split("/").pop()!);
      });

      let continuationToken: string | undefined;
      do {
        const list = await s3Client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "photox/public/", ContinuationToken: continuationToken }));
        list.Contents?.forEach(c => { if (c.Key) r2Files.add(c.Key.split("/").pop()!); });
        continuationToken = list.NextContinuationToken;
      } while (continuationToken);

      let healthy = 0;
      let missing = 0;
      let orphans = 0;

      dbFiles.forEach(f => { if (r2Files.has(f)) healthy++; else missing++; });
      r2Files.forEach(f => { if (!dbFiles.has(f)) orphans++; });

      return c.json({ success: true, data: { healthy, missing, orphans } });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
  })
  .post("/storage/clean", async (c) => {
    try {
      const supabase = await getSupabaseAdmin();
      const s3Client = await getR2Client();
      const bucket = serverEnv.R2_BUCKET_NAME || 'photox-storage';

      const { data: photos, error } = await supabase.from("furniture_items").select("image_url, thumb_url");
      if (error) throw error;

      const dbFiles: Set<string> = new Set();
      photos.forEach(p => {
        if (p.image_url?.includes("r2")) dbFiles.add(p.image_url.split("/").pop()!);
        if (p.thumb_url?.includes("r2")) dbFiles.add(p.thumb_url.split("/").pop()!);
      });

      const r2FilesToClean: string[] = [];
      let continuationToken: string | undefined;
      do {
        const list = await s3Client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "photox/public/", ContinuationToken: continuationToken }));
        list.Contents?.forEach(c => {
          if (c.Key) {
            const filename = c.Key.split("/").pop();
            if (filename && !dbFiles.has(filename)) {
              r2FilesToClean.push(c.Key);
            }
          }
        });
        continuationToken = list.NextContinuationToken;
      } while (continuationToken);

      if (r2FilesToClean.length > 0) {
        await Promise.all(r2FilesToClean.map(async (key) => {
          return s3Client.send(new DeleteObjectCommand({
            Bucket: bucket,
            Key: key
          }));
        }));
      }

      return c.json({ success: true, data: { cleanedCount: r2FilesToClean.length, files: r2FilesToClean } });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
  })
  .post("/ai/analyze", async (c) => {
    try {
      const { base64Image, customModel, promptText } = await c.req.json();
      const apiKey = serverEnv.GEMINI_API_KEY;

      if (!apiKey) {
        return c.json({ error: "Server API key not configured" }, 500);
      }

      const modelName = customModel || "google/gemini-1.5-flash";
      
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Title": "Product Cataloger AI"
        },
        body: JSON.stringify({
          model: modelName.replace('openrouter/', ''),
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                {
                  type: "image_url",
                  image_url: { url: base64Image }
                }
              ]
            }
          ],
          response_format: { type: "json_object" },
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const err = await response.text();
        return c.json({ error: err }, response.status as any);
      }

      const data = await response.json();
      return c.json(data);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  })
  .post("/ai/translate", async (c) => {
    try {
      const { customModel, promptText } = await c.req.json();
      const apiKey = serverEnv.GEMINI_API_KEY;
      if (!apiKey) return c.json({ error: "Server API key not configured" }, 500);

      const modelName = customModel || "google/gemini-1.5-flash";
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName.replace('openrouter/', ''),
          messages: [{ role: "user", content: promptText }],
          response_format: { type: "json_object" },
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const err = await response.text();
        return c.json({ error: err }, response.status as any);
      }

      const data = await response.json();
      return c.json(data);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

export type AppType = typeof apiRoutes;

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
      console.log(`>>> Hono + Vite (Dev) listening on 0.0.0.0:${PORT}`);
      // [DEV-BRIDGE-PREWARMED] v2.11.1
      // 啟動時主動觸發一次 health 請求預熱 JIT
      fetch(`http://127.0.0.1:${PORT}/api/health`)
        .then(() => console.log('>>> [PREWARM] Dev Bridge Ready'))
        .catch(() => {});
    });
  } else {
    // Production Mode
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

if (serverEnv.VERCEL !== "1") {
  bootstrap().catch(err => {
    console.error("CRITICAL: Bootstrap failed", err);
  });
}
