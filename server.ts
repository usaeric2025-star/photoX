import express from "express";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

async function startServer() {
  const app = express();
  const PORT = process.env.NODE_ENV === "production" ? (Number(process.env.PORT) || 3000) : 3000;

  // Basic middleware
  app.use(express.json({ limit: '50mb' }));

  // Storage Presign Endpoint (R2)
  app.post("/api/storage/presign", async (req, res) => {
    try {
      const { fileName, contentType } = req.body;
      if (!fileName) return res.status(400).json({ error: "fileName required" });

      let r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || '';
      let r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
      if (r2AccessKeyId.length === 64 && r2SecretAccessKey.length === 32) {
        const temp = r2AccessKeyId;
        r2AccessKeyId = r2SecretAccessKey;
        r2SecretAccessKey = temp;
      }

      const s3Client = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT || 'https://3e1f6d6a9c0f2526239f23a5809fc667.r2.cloudflarestorage.com',
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
        },
      });

      const command = new PutObjectCommand({
        Bucket: 'photox-storage',
        Key: fileName,
        ContentType: contentType || 'application/octet-stream',
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      res.json({ uploadUrl });
    } catch(e: any) {
      console.error("Presign error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
  });

  // Migration Endpoint (SSE)
  app.get("/api/migrate-r2", async (req, res) => {
    // 设置 SSE 响应头（让前端实时接收进度）
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
      res.write(`data: ${JSON.stringify({ type, message })}\n\n`);
    };

    try {
      sendLog('开始 R2 迁移...', 'info');

      // Setup Supabase
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        sendLog('SUPABASE 配置缺失', 'error');
        res.end();
        return;
      }
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // 1. 获取照片列表
      sendLog('正在获取照片列表...', 'info');
      const { data: photos, error: supabaseError } = await supabase.from('furniture_items').select('id, image_url, thumb_url');
      if (supabaseError) throw supabaseError;
      
      sendLog(`共 ${photos?.length || 0} 张照片`, 'info');
      
      let successCount = 0;
      let failCount = 0;
      
      const r2Endpoint = process.env.R2_ENDPOINT || 'https://3e1f6d6a9c0f2526239f23a5809fc667.r2.cloudflarestorage.com';
      let r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || '';
      let r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
      if (r2AccessKeyId.length === 64 && r2SecretAccessKey.length === 32) {
        const temp = r2AccessKeyId;
        r2AccessKeyId = r2SecretAccessKey;
        r2SecretAccessKey = temp;
      }

      const s3Client = new S3Client({
        region: 'auto',
        endpoint: r2Endpoint,
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
        },
      });

      for (let i = 0; i < photos!.length; i++) {
        const photo = photos![i];
        sendLog(`[${i + 1}/${photos!.length}] 处理照片 ${photo.id}...`, 'info');
        
        try {
          if (!photo.image_url) throw new Error('No image_url');

          // Download
          const response = await fetch(photo.image_url);
          if (!response.ok) throw new Error('Download failed');
          const imageBuffer = Buffer.from(await response.arrayBuffer());
          
          // Upload
          const filename = photo.image_url.split('/').pop();
          const objectKey = `photox/public/${filename}`;
          
          await s3Client.send(new PutObjectCommand({
            Bucket: 'photox-storage',
            Key: objectKey,
            Body: imageBuffer,
            ContentType: 'image/webp',
          }));
          
          successCount++;
          sendLog(`  ✅ ${photo.id} 迁移成功`, 'success');
          
        } catch (err: any) {
          failCount++;
          sendLog(`  ❌ ${photo.id} 迁移失败: ${err.message}`, 'error');
        }
      }
      
      sendLog(`========== 迁移完成 ==========`, 'success');
      sendLog(`成功: ${successCount}, 失败: ${failCount}`, 'info');
      
      res.write(`data: ${JSON.stringify({ type: "done", success: successCount, fail: failCount })}\n\n`);
      res.end();
      
    } catch (error: any) {
      sendLog(`迁移失败: ${error.message}`, 'error');
      res.end();
    }
  });

  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const { base64Image, categories, tags, manufacturers, customModel, targetCategoryId, originalName } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Server API key not configured" });
      }

      // We'll import the logic from geminiService but run it here
      // For now, let's keep it simple and just fetch OpenRouter directly from server
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
                { type: "text", text: req.body.promptText }, // Client sends the prompt
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
      const { text, targetLang, customModel } = req.body;
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

  // Node environment handling
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // In dev mode, Vite middleware handles most SPA routes, but let's be explicit
    // if Vite passes through.
    app.get('*all', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.includes('.')) {
        return next();
      }
      // Vite handles this usually, but a fallback helps
      next();
    });
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // SPA Fallback: serve index.html for all non-API GET requests
    app.get('*all', (req, res, next) => {
      // Avoid serving index.html for specific files or api
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

startServer().catch((err) => {
  console.error("CRITICAL ERROR: Server failed to start", err);
  process.exit(1);
});
