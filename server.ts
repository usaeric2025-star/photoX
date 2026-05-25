import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand, ListObjectsV2Command, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = express();
export { app };

// --- Global Utilities & Clients ---

async function getSupabaseAdmin() {
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY; 
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("[getSupabaseAdmin] Credentials missing!");
    throw new Error("Supabase credentials missing (SUPABASE_URL/SUPABASE_SERVICE_KEY)");
  }
  return createClient(supabaseUrl, supabaseKey);
}

async function getR2Client() {
  const r2Endpoint = process.env.R2_ENDPOINT || 'https://3e1f6d6a9c0f2526239f23a5809fc667.r2.cloudflarestorage.com';
  let r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || '';
  let r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
  
  // Safeguard for common user mistakes (copy-pasting swapped keys)
  if (r2AccessKeyId.length === 64 && r2SecretAccessKey.length === 32) {
    const temp = r2AccessKeyId;
    r2AccessKeyId = r2SecretAccessKey;
    r2SecretAccessKey = temp;
  }

  if (!r2AccessKeyId || !r2SecretAccessKey) {
    console.error("[getR2Client] R2 Credentials missing!");
    throw new Error("R2 credentials missing (R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY)");
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

app.use(express.json({ limit: '50mb' }));

  app.post("/api/upload-presign", async (req, res) => {
    try {
      const { photoId, contentType } = req.body;
      if (!photoId) return res.status(400).json({ error: "photoId required" });
      
      const fileName = `photox/public/${photoId}.webp`;
      const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || '';
      const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
      
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT || 'https://3e1f6d6a9c0f2526239f23a5809fc667.r2.cloudflarestorage.com',
        credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
        forcePathStyle: true,
      });
      
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || 'photox-storage',
        Key: fileName,
        ContentType: contentType || 'image/webp',
      });
      
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
      const publicUrl = `${process.env.R2_PUBLIC_URL_PREFIX || 'https://pub-ffc4b0692ab74fabb58cbccc5287d7b1.r2.dev'}/${fileName}`;
      
      res.json({ uploadUrl, publicUrl });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/r2-delete", async (req, res) => {
    try {
      const { fileKeys } = req.body;
      if (!fileKeys || !Array.isArray(fileKeys)) {
        return res.status(400).json({ error: "fileKeys array required" });
      }
      
      const s3Client = await getR2Client();
      const bucketName = process.env.R2_BUCKET_NAME || 'photox-storage';
      
      await Promise.all(fileKeys.map(async (key) => {
          const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
          });
          return s3Client.send(command);
      }));
      
      res.json({ success: true });
    } catch(e: any) {
      console.error("[R2 Delete Error]", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
  });

  app.get("/api/storage/audit", async (req, res) => {
    try {
      const supabase = await getSupabaseAdmin();
      const s3Client = await getR2Client();
      const bucket = process.env.R2_BUCKET_NAME || 'photox-storage';

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

      res.json({ healthy, missing, orphans });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/storage/clean", async (req, res) => {
    try {
      const supabase = await getSupabaseAdmin();
      const s3Client = await getR2Client();
      const bucket = process.env.R2_BUCKET_NAME || 'photox-storage';

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

      res.json({ success: true, cleanedCount: r2FilesToClean.length, files: r2FilesToClean });
    } catch (e: any) {
      console.error("[Storage Clean Error]", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const { base64Image, customModel } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Server API key not configured" });
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
                { type: "text", text: req.body.promptText },
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
        console.error(`[AI Proxy HTTP Error] Status ${response.status}:`, err);
        return res.status(response.status).json({ error: err });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("AI Proxy Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/translate", async (req, res) => {
    try {
      const { customModel } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Server API key not configured" });

      const modelName = customModel || "google/gemini-1.5-flash";
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName.replace('openrouter/', ''),
          messages: [{ role: "user", content: req.body.promptText }],
          response_format: { type: "json_object" },
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(`[AI Translate HTTP Error] Status ${response.status}:`, err);
        return res.status(response.status).json({ error: err });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });



async function startServer() {
  const PORT = process.env.NODE_ENV === "production" ? (Number(process.env.PORT) || 3000) : 3000;

  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.get('*all', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.includes('.')) {
        return next();
      }
      next();
    });
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    app.get('*all', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.includes('.')) {
        return next();
      }
      
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error("Error sending index.html:", err);
          res.status(500).send("Server Error: index.html not found");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> Server listening on 0.0.0.0:${PORT}`);
  });
}

const isVercel = process.env.VERCEL === "1";
if (!isVercel) {
  startServer().catch((err) => {
    console.error("CRITICAL ERROR: Server failed to start", err);
    process.exit(1);
  });
}
