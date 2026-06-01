import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { cors } from "hono/cors";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerEnv } from "./src/shared/envSchema";
import { logTraffic } from "./src/lib/trafficCapture";

// 启动校验
const serverEnv = getServerEnv(process.env);

export async function getR2Client() {
  const r2Endpoint = serverEnv.R2_ENDPOINT;
  let r2AccessKeyId = serverEnv.R2_ACCESS_KEY_ID || '';
  let r2SecretAccessKey = serverEnv.R2_SECRET_ACCESS_KEY || '';
  
  if (r2AccessKeyId.length === 64 && r2SecretAccessKey.length === 32) {
    const temp = r2AccessKeyId;
    r2AccessKeyId = r2SecretAccessKey;
    r2SecretAccessKey = temp;
  }

  if (!r2AccessKeyId || !r2SecretAccessKey || !r2Endpoint) {
    console.error("[getR2Client] R2 Credentials missing!", { endpoint: !!r2Endpoint, key: !!r2AccessKeyId, secret: !!r2SecretAccessKey });
    throw new Error("R2 storage credentials missing. Please check R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY env variables.");
  }

  return new S3Client({
    region: 'auto',
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
    forcePathStyle: true,
  });
}

// --- Hono App Implementation ---
export const app = new Hono().basePath("/api");

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
      const { photoId, fileKey, contentType } = await c.req.json();
      if (!photoId && !fileKey) return c.json({ error: "photoId or fileKey required" }, 400);
      
      const fileName = fileKey ? `photox/public/${fileKey}` : `photox/public/${photoId}.webp`;
      const s3Client = await getR2Client();
      
      const bucketName = serverEnv.R2_BUCKET_NAME;
      if (!bucketName) throw new Error("R2_BUCKET_NAME missing");

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        ContentType: contentType || 'image/webp',
      });
      
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
      if (!serverEnv.R2_PUBLIC_URL_PREFIX) throw new Error("R2_PUBLIC_URL_PREFIX missing");
      const publicUrl = `${serverEnv.R2_PUBLIC_URL_PREFIX}/${fileName}`;
      
      return c.json({ success: true, data: { uploadUrl, publicUrl } });
    } catch(e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
  })
  .post("/upload-direct", async (c) => {
    try {
      const { base64Data, fileKey, contentType } = await c.req.json();
      if (!base64Data) return c.json({ success: false, error: "base64Data required" }, 400);

      // Convert base64 to binary buffer
      const base64Content = base64Data.split(',')[1] || base64Data;
      const buffer = Buffer.from(base64Content, 'base64');
      
      const fileName = fileKey ? `photox/public/${fileKey}` : `photox/public/upload_${Date.now()}.webp`;
      const s3Client = await getR2Client();
      
      const bucketName = serverEnv.R2_BUCKET_NAME;
      if (!bucketName) throw new Error("R2_BUCKET_NAME missing");
      
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        ContentType: contentType || 'image/webp',
        Body: buffer
      });
      
      await s3Client.send(command);
      
      if (!serverEnv.R2_PUBLIC_URL_PREFIX) throw new Error("R2_PUBLIC_URL_PREFIX missing");
      const publicUrl = `${serverEnv.R2_PUBLIC_URL_PREFIX}/${fileName}`;
      return c.json({ success: true, data: { publicUrl } });
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
      const bucketName = serverEnv.R2_BUCKET_NAME;
      if (!bucketName) throw new Error("R2_BUCKET_NAME missing");
      
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
  .get("/admin/diagnose", async (c) => {
    try {
      const supabase = await getSupabaseAdmin();
      const issues: any[] = [];
      
      // Fetch all required data for cross-referencing
      const [
        { data: photos, error: pErr },
        { data: groups, error: gErr },
        { data: categories, error: cErr },
        { data: manufacturers, error: mErr },
        { data: tags, error: tErr }
      ] = await Promise.all([
        supabase.from("furniture_items").select("id, group_id, category_id, manufacturer_id, image_hash, image_url, thumb_url, thumb_hash, name"),
        supabase.from("groups").select("id, name, member_count"),
        supabase.from("categories").select("id"),
        supabase.from("manufacturers").select("id"),
        supabase.from("tags").select("id")
      ]);

      if (pErr) throw pErr;
      if (!photos) throw new Error("Could not fetch photos");
      
      const groupIds = new Set(groups?.map(g => String(g.id)) || []);
      const categoryIds = new Set(categories?.map(c => String(c.id)) || []);
      const manufacturerIds = new Set(manufacturers?.map(m => String(m.id)) || []);
      
      // 1. Orphaned Photos (P0)
      const orphanedPhotos = photos.filter(p => p.group_id && !groupIds.has(String(p.group_id)));
      if (orphanedPhotos.length > 0) {
        issues.push({
          id: 'orphaned_photos',
          category: 'integrity',
          severity: 'P0',
          title: '孤儿照片',
          description: '照片指向了不存在的合组',
          affectedCount: orphanedPhotos.length,
          sampleIds: orphanedPhotos.slice(0, 5).map(p => p.id),
          autoFixable: false
        });
      }

      // 2. Empty Groups (P0)
      const photosByGroup = new Map<string, number>();
      photos.forEach(p => {
        if (p.group_id) {
          const gid = String(p.group_id);
          photosByGroup.set(gid, (photosByGroup.get(gid) || 0) + 1);
        }
      });
      const emptyGroups = groups?.filter(g => !photosByGroup.has(String(g.id))) || [];
      if (emptyGroups.length > 0) {
        issues.push({
          id: 'empty_groups',
          category: 'integrity',
          severity: 'P0',
          title: '空合组',
          description: '有些合组中没有任何照片',
          affectedCount: emptyGroups.length,
          sampleIds: emptyGroups.slice(0, 5).map(g => String(g.id)),
          autoFixable: true
        });
      }

      // 3. member_count mismatch (P0)
      const mismatchedGroups = groups?.filter(g => {
         const actualCount = photosByGroup.get(String(g.id)) || 0;
         const storedCount = g.member_count ?? 0;
         return actualCount !== storedCount;
      }) || [];
      if (mismatchedGroups.length > 0) {
         issues.push({
           id: 'member_count_mismatch',
           category: 'consistency',
           severity: 'P0',
           title: '成员数不匹配',
           description: '合组记录的成员数量与实际照片数量不符',
           affectedCount: mismatchedGroups.length,
           sampleIds: mismatchedGroups.slice(0, 5).map(g => String(g.id)),
           autoFixable: true
         });
      }

      // 4. Duplicate image_hash (P0)
      const hashCounts = new Map<string, string[]>();
      photos.forEach(p => {
        if (p.image_hash) {
          const list = hashCounts.get(p.image_hash) || [];
          list.push(p.id);
          hashCounts.set(p.image_hash, list);
        }
      });
      const duplicateHashes = Array.from(hashCounts.entries()).filter(([_, ids]) => ids.length > 1);
      if (duplicateHashes.length > 0) {
        issues.push({
          id: 'duplicate_hash',
          category: 'consistency',
          severity: 'P0',
          title: '重复的照片 (Hash)',
          description: '多张照片具有相同的图像指纹，可能是重复上传',
          affectedCount: duplicateHashes.length,
          sampleIds: duplicateHashes.slice(0, 5).flatMap(([_, ids]) => ids.slice(0, 2)),
          autoFixable: false
        });
      }

      // 5. Invalid Categories (P1)
      const invalidCatPhotos = photos.filter(p => p.category_id && !categoryIds.has(String(p.category_id)));
      if (invalidCatPhotos.length > 0) {
        issues.push({
          id: 'invalid_categories',
          category: 'integrity',
          severity: 'P1',
          title: '无效分类',
          description: '照片引用了不存在的分类 ID',
          affectedCount: invalidCatPhotos.length,
          sampleIds: invalidCatPhotos.slice(0, 5).map(p => p.id),
          autoFixable: false
        });
      }

      // 6. Invalid Manufacturers (P1)
      const invalidMfrPhotos = photos.filter(p => p.manufacturer_id && !manufacturerIds.has(String(p.manufacturer_id)));
      if (invalidMfrPhotos.length > 0) {
        issues.push({
          id: 'invalid_manufacturers',
          category: 'integrity',
          severity: 'P1',
          title: '无效厂商',
          description: '照片引用了不存在的厂商 ID',
          affectedCount: invalidMfrPhotos.length,
          sampleIds: invalidMfrPhotos.slice(0, 5).map(p => p.id),
          autoFixable: false
        });
      }

      // 7. URL format check (P1)
      const invalidUrls = photos.filter(p => {
        const checkUrl = (url: string | null) => {
          if (!url) return false; 
          return !url.includes('r2.dev') && !url.includes('supabase') && !url.startsWith('http');
        };
        return checkUrl(p.image_url) || checkUrl(p.thumb_url);
      });
      if (invalidUrls.length > 0) {
        issues.push({
          id: 'invalid_urls',
          category: 'file',
          severity: 'P1',
          title: 'URL 格式不规范',
          description: '图片的存储地址不符合标准格式 (R2/Supabase/HTTP)',
          affectedCount: invalidUrls.length,
          sampleIds: invalidUrls.slice(0, 5).map(p => p.id),
          autoFixable: false
        });
      }

      // 8. Missing thumb_hash (P1)
      const missingThumbHash = photos.filter(p => !p.thumb_hash);
      if (missingThumbHash.length > 0) {
        issues.push({
          id: 'missing_thumb_hash',
          category: 'file',
          severity: 'P1',
          title: '缺少缩略图哈希',
          description: '照片缺少用于模糊预览的缩略图哈希 (thumb_hash)',
          affectedCount: missingThumbHash.length,
          sampleIds: missingThumbHash.slice(0, 5).map(p => p.id),
          autoFixable: true
        });
      }

      return c.json({
        timestamp: Date.now(),
        totalIssues: issues.length,
        issuesBySeverity: {
          P0: issues.filter(i => i.severity === 'P0').length,
          P1: issues.filter(i => i.severity === 'P1').length,
          P2: 0,
          P3: 0
        },
        issues
      });

    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
  })
  .post("/admin/repair/:issueId", async (c) => {
    try {
      const issueId = c.req.param('issueId');
      const supabase = await getSupabaseAdmin();
      
      if (issueId === 'member_count_mismatch') {
         const { data: photos } = await supabase.from("furniture_items").select("group_id");
         const counts = new Map<string, number>();
         photos?.forEach(p => {
           if (p.group_id) {
             const gid = String(p.group_id);
             counts.set(gid, (counts.get(gid) || 0) + 1);
           }
         });
         
         const { data: groups } = await supabase.from("groups").select("id");
         if (groups) {
           await Promise.all(groups.map(g => 
             supabase.from("groups").update({ member_count: counts.get(String(g.id)) || 0 }).eq("id", g.id)
           ));
         }
         return c.json({ success: true, message: '成员数同步完成' });
      }

      if (issueId === 'empty_groups') {
         const { data: photos } = await supabase.from("furniture_items").select("group_id");
         const photoGroupIds = new Set(photos?.map(p => String(p.group_id)).filter(Boolean));
         
         const { data: groups } = await supabase.from("groups").select("id");
         const emptyGroupIds = groups?.filter(g => !photoGroupIds.has(String(g.id))).map(g => g.id) || [];
         
         if (emptyGroupIds.length > 0) {
           await supabase.from("groups").delete().in("id", emptyGroupIds);
         }
         return c.json({ success: true, message: `清理了 ${emptyGroupIds.length} 个空合组` });
      }

      return c.json({ success: false, error: 'Unsupported repair' }, 400);
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
      const bucket = serverEnv.R2_BUCKET_NAME;
      if (!bucket) throw new Error("R2_BUCKET_NAME missing");

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
      const bucket = serverEnv.R2_BUCKET_NAME;
      if (!bucket) throw new Error("R2_BUCKET_NAME missing");

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
