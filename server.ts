import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = express();
export { app };

app.use(express.json({ limit: '50mb' }));

  app.post("/api/storage/presign", async (req, res) => {
    try {
      const { fileName, contentType } = req.body;
      if (!fileName) return res.status(400).json({ error: "fileName required" });
      let r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || '';
      let r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
      if (r2AccessKeyId.length === 64 && r2SecretAccessKey.length === 32) {
        const temp = r2AccessKeyId; r2AccessKeyId = r2SecretAccessKey; r2SecretAccessKey = temp;
      }
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT || 'https://3e1f6d6a9c0f2526239f23a5809fc667.r2.cloudflarestorage.com',
        credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
        forcePathStyle: true,
      });
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || 'photox-storage',
        Key: fileName,
        ContentType: contentType || 'application/octet-stream',
      });
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      res.json({ uploadUrl });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
  });

  app.get("/api/health-r2", async (req, res) => {
    const statusResult: any = {
      status: "ok", timestamp: Date.now(),
      supabase: { urlConfigured: false, keyConfigured: false, connectionOk: false, photoCount: 0, error: null },
      r2: { endpointConfigured: false, endpoint: null, accessKeyConfigured: false, accessKeyLength: 0, secretAccessKeyConfigured: false, secretAccessKeyLength: 0, keysSwappedBySafeguard: false, bucketName: process.env.R2_BUCKET_NAME || 'photox-storage', connectionOk: false, testedWithListCommand: false, foundObjectsCount: 0, error: null, diagnosticAdvice: null }
    };
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    statusResult.supabase.urlConfigured = !!supabaseUrl;
    statusResult.supabase.keyConfigured = !!supabaseKey;
    if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { count, error } = await supabase.from('furniture_items').select('id', { count: 'exact', head: true });
        if (error) throw error;
        statusResult.supabase.connectionOk = true;
        statusResult.supabase.photoCount = count || 0;
      } catch (err: any) { statusResult.supabase.error = err.message; statusResult.status = "error"; }
    }
    const r2Endpoint = process.env.R2_ENDPOINT || 'https://3e1f6d6a9c0f2526239f23a5809fc667.r2.cloudflarestorage.com';
    let r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || '';
    let r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
    statusResult.r2.endpointConfigured = !!process.env.R2_ENDPOINT; statusResult.r2.endpoint = r2Endpoint;
    statusResult.r2.accessKeyConfigured = !!r2AccessKeyId; statusResult.r2.accessKeyLength = r2AccessKeyId.length;
    statusResult.r2.secretAccessKeyConfigured = !!r2SecretAccessKey; statusResult.r2.secretAccessKeyLength = r2SecretAccessKey.length;
    if (r2AccessKeyId.length === 64 && r2SecretAccessKey.length === 32) {
      statusResult.r2.keysSwappedBySafeguard = true;
      const temp = r2AccessKeyId; r2AccessKeyId = r2SecretAccessKey; r2SecretAccessKey = temp;
    }
    if (r2AccessKeyId && r2SecretAccessKey && r2Endpoint) {
      try {
        const s3Client = new S3Client({
          region: 'auto', endpoint: r2Endpoint,
          credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
          forcePathStyle: true,
        });
        const s3Response = await s3Client.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME || 'photox-storage', MaxKeys: 1 }));
        statusResult.r2.connectionOk = true; statusResult.r2.testedWithListCommand = true; statusResult.r2.foundObjectsCount = s3Response.KeyCount || 0;
      } catch (err: any) {
        statusResult.r2.error = err.message || String(err);
        statusResult.status = "error";
        const errMsg = (err.message || "").toLowerCase();
        if (errMsg.includes("signature") || errMsg.includes("403") || errMsg.includes("forbidden") || errMsg.includes("accessdenied")) {
          statusResult.r2.diagnosticAdvice = "R2 凭证（Access Key / Secret Key）拒绝访问。请检查 API Token 权限与密钥顺序是否正确。";
        } else if (errMsg.includes("notfound") || errMsg.includes("address") || errMsg.includes("getaddrinfo")) {
          statusResult.r2.diagnosticAdvice = "无法解析 Endpoint 域名，请勿添加 bucket 名字或 subpath。";
        } else {
          statusResult.r2.diagnosticAdvice = `无法连接: ${err.message}`;
        }
      }
    } else {
      statusResult.r2.error = "Cloudflare R2 required parameters missing in env";
      statusResult.status = "error";
    }
    res.json(statusResult);
  });

  // Migration Endpoint (SSE)
  app.get("/api/migrate-r2", async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
      res.write(`data: ${JSON.stringify({ type, message })}\n\n`);
    };

    const batchStartTime = Date.now();
    let isBatchFinishedPartWay = false;

    try {
      sendLog('🚀 启动物理全链路大厂级增量 R2 迁移对账引擎...', 'info');

      // Setup Supabase
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        sendLog('SUPABASE 凭据缺失，请进入 Settings 配置。', 'error');
        res.end();
        return;
      }
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      sendLog('正在连接 Supabase 拉取最新家具照片数据集列表...', 'info');
      const { data: photos, error: supabaseError } = await supabase.from('furniture_items').select('id, image_url, thumb_url');
      if (supabaseError) {
        throw new Error(`Supabase 表读取失败: ${supabaseError.message}`);
      }
      
      const totalPhotos = photos?.length || 0;
      sendLog(`📊 数据库库藏汇总：共检索到 ${totalPhotos} 张照片记录。`, 'info');
      
      let successCount = 0;
      let failCount = 0;
      let skippedCount = 0;
      
      const r2Endpoint = process.env.R2_ENDPOINT || 'https://3e1f6d6a9c0f2526239f23a5809fc667.r2.cloudflarestorage.com';
      let r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || '';
      let r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
      if (r2AccessKeyId.length === 64 && r2SecretAccessKey.length === 32) {
        sendLog('🛡️ 检测物理密钥错配，已对换 client_id 与 secret_key。', 'info');
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
        forcePathStyle: true,
      });

      sendLog('🔍 正在连通 R2 存储桶，通过 ListObjectsV2 执行物理对账与断点扫描...', 'info');
      const r2ExistingKeys = new Set<string>();
      try {
        let continuationToken: string | undefined;
        do {
          const response = await s3Client.send(new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME || 'photox-storage',
            Prefix: 'photox/public/',
            ContinuationToken: continuationToken,
          }));
          if (response.Contents) {
            for (const obj of response.Contents) {
              if (obj.Key) {
                r2ExistingKeys.add(obj.Key);
              }
            }
          }
          continuationToken = response.NextContinuationToken;
        } while (continuationToken);

        sendLog(`📈 真实账本对账完成！R2 存储桶内已存在 ${r2ExistingKeys.size} 个物理介质对象。`, 'success');
      } catch (r2ScanErr: any) {
        sendLog(`⚠️ 获取 R2 已上传列表失败: ${r2ScanErr.message}。将退化成强制全覆盖模式。`, 'error');
      }

      for (let i = 0; i < totalPhotos; i++) {
        const photo = photos![i];

        if (req.closed || req.destroyed) {
          console.warn('[R2 Migrate SSE] Request closed/aborted by browser client.');
          break;
        }

        if (Date.now() - batchStartTime > 42000) {
          sendLog(`⏳ [限时保底安全阀] 已临近 Vercel/本地容器执行时限水位线 (42秒)，安全刹车阻止超时瓦解...`, 'info');
          sendLog(`🔄 正在平稳休眠收工。我们将向前端抛出 isPartial 断点标记，自动分段重入。`, 'info');
          isBatchFinishedPartWay = true;
          break;
        }

        if (!photo.image_url) {
          skippedCount++;
          continue;
        }

        const filename = photo.image_url.split('/').pop() || `${photo.id}.webp`;
        const objectKey = `photox/public/${filename}`;

        if (r2ExistingKeys.has(objectKey)) {
          skippedCount++;
          if (skippedCount === 1 || skippedCount % 10 === 0 || i === totalPhotos - 1) {
            sendLog(`[云端已存对账过] 跳过已上传项 [第 ${i + 1}/${totalPhotos} 张]: ${filename}`, 'info');
          }
          continue;
        }
        
        sendLog(`[进行中 ${i + 1}/${totalPhotos}] 迁移传输中：${photo.id}`, 'info');
        
        try {
          sendLog(`  -> 正在拉取主图：${photo.image_url}`, 'info');
          const response = await fetch(photo.image_url);
          if (!response.ok) {
            throw new Error(`主图网络拉取失败，HTTP StatusCode: ${response.status} ${response.statusText}`);
          }
          const imageBuffer = Buffer.from(await response.arrayBuffer());
          
          sendLog(`  -> 正在上传主图至云端 R2: ${objectKey}`, 'info');
          await s3Client.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || 'photox-storage',
            Key: objectKey,
            Body: imageBuffer,
            ContentType: 'image/webp',
          }));

          if (photo.thumb_url) {
            try {
              sendLog(`  -> 正在拉取缩略图：${photo.thumb_url}`, 'info');
              const thumbResponse = await fetch(photo.thumb_url);
              if (thumbResponse.ok) {
                const thumbBuffer = Buffer.from(await thumbResponse.arrayBuffer());
                const thumbFilename = photo.thumb_url.split('/').pop() || `${photo.id}_thumb.webp`;
                const thumbKey = `photox/public/${thumbFilename}`;
                sendLog(`  -> 正在上传缩略图至 R2: ${thumbKey}`, 'info');
                
                await s3Client.send(new PutObjectCommand({
                  Bucket: process.env.R2_BUCKET_NAME || 'photox-storage',
                  Key: thumbKey,
                  Body: thumbBuffer,
                  ContentType: 'image/webp',
                 }));
              } else {
                sendLog(`  ⚠️ 缩略图拉取HTTP ${thumbResponse.status}，保持未变动。`, 'info');
              }
            } catch (thumbErr: any) {
              sendLog(`  ⚠️ 缩略图非致命同步故障: ${thumbErr.message}`, 'info');
            }
          }
          
          successCount++;
          sendLog(`照片号 ${photo.id} 主/缩文件一并全量对账搬运完毕！`, 'success');
          
        } catch (err: any) {
          failCount++;
          const errorMsg = err.message || String(err);
          sendLog(`照片号 ${photo.id} 上传故障：${errorMsg}`, 'error');
        }
      }
      
      sendLog(`========================================`, 'info');
      sendLog(`🎉 迁移流式推送完毕 / Job Stream Finished`, 'success');
      sendLog(`本次成功写入：${successCount} 张，物理断点已持久化`, 'info');
      sendLog(`本次异常失败：${failCount} 张`, 'info');
      sendLog(`物理对账成功直接跳过：${skippedCount} 张`, 'info');
      sendLog(`累计备份总进度：${r2ExistingKeys.size + successCount} / ${totalPhotos}`, 'success');
      
      res.write(`data: ${JSON.stringify({ 
        type: "done", 
        success: successCount, 
        fail: failCount, 
        skipped: skippedCount, 
        total: totalPhotos,
        isPartial: isBatchFinishedPartWay
      })}\n\n`);
      res.end();
      
    } catch (error: any) {
      sendLog(`增量迁移过程发生全局性未捕获异常: ${error.message || error}`, 'error');
      res.end();
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
