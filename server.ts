import express from "express";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
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

  // Detailed R2 & Supabase connection diagnostics
  app.get("/api/health-r2", async (req, res) => {
    const statusResult: any = {
      status: "ok",
      timestamp: Date.now(),
      supabase: {
        urlConfigured: false,
        keyConfigured: false,
        connectionOk: false,
        photoCount: 0,
        error: null
      },
      r2: {
        endpointConfigured: false,
        endpoint: null,
        accessKeyConfigured: false,
        accessKeyLength: 0,
        secretAccessKeyConfigured: false,
        secretAccessKeyLength: 0,
        keysSwappedBySafeguard: false,
        bucketName: 'photox-storage',
        connectionOk: false,
        testedWithListCommand: false,
        foundObjectsCount: 0,
        error: null,
        diagnosticAdvice: null
      }
    };

    // 1. Diagnose Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    statusResult.supabase.urlConfigured = !!supabaseUrl;
    statusResult.supabase.keyConfigured = !!supabaseKey;

    if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { count, error } = await supabase
          .from('furniture_items')
          .select('id', { count: 'exact', head: true });

        if (error) {
          throw error;
        }
        statusResult.supabase.connectionOk = true;
        statusResult.supabase.photoCount = count || 0;
      } catch (err: any) {
        statusResult.supabase.error = err.message || String(err);
        statusResult.status = "error";
      }
    } else {
      statusResult.supabase.error = "SUPABASE_URL 或 SUPABASE_SERVICE_KEY 缺失";
      statusResult.status = "error";
    }

    // 2. Diagnose R2 Cloudflare
    const r2Endpoint = process.env.R2_ENDPOINT || 'https://3e1f6d6a9c0f2526239f23a5809fc667.r2.cloudflarestorage.com';
    let r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || '';
    let r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';

    statusResult.r2.endpointConfigured = !!process.env.R2_ENDPOINT;
    statusResult.r2.endpoint = r2Endpoint;
    statusResult.r2.accessKeyConfigured = !!r2AccessKeyId;
    statusResult.r2.accessKeyLength = r2AccessKeyId.length;
    statusResult.r2.secretAccessKeyConfigured = !!r2SecretAccessKey;
    statusResult.r2.secretAccessKeyLength = r2SecretAccessKey.length;

    if (r2AccessKeyId.length === 64 && r2SecretAccessKey.length === 32) {
      statusResult.r2.keysSwappedBySafeguard = true;
      const temp = r2AccessKeyId;
      r2AccessKeyId = r2SecretAccessKey;
      r2SecretAccessKey = temp;
    }

    if (r2AccessKeyId && r2SecretAccessKey && r2Endpoint) {
      try {
        const s3Client = new S3Client({
          region: 'auto',
          endpoint: r2Endpoint,
          credentials: {
            accessKeyId: r2AccessKeyId,
            secretAccessKey: r2SecretAccessKey,
          },
        });

        // Test list command to verify config, bucket, credentials
        const listCommand = new ListObjectsV2Command({
          Bucket: 'photox-storage',
          MaxKeys: 1,
        });

        const s3Response = await s3Client.send(listCommand);
        statusResult.r2.connectionOk = true;
        statusResult.r2.testedWithListCommand = true;
        statusResult.r2.foundObjectsCount = s3Response.KeyCount || 0;
      } catch (err: any) {
        statusResult.r2.error = err.message || String(err);
        statusResult.status = "error";

        // Give precise user advice
        const errMsg = (err.message || "").toLowerCase();

        if (errMsg.includes("signature") || errMsg.includes("403") || errMsg.includes("forbidden") || errMsg.includes("accessdenied")) {
          statusResult.r2.diagnosticAdvice = "R2 凭证（Access Key / Secret Key）拒绝访问。常见原因：1. 创建的可擦写 R2 API Token 并非 S3 兼容凭证，或者没有主存储桶写的读写权限。2. Key 配置处发生了混淆，或包含首尾空格乱码。请到 Cloudflare 'R2' -> 'Manage R2 API Tokens' 获取正确的 Access Key ID (32位精简字符) 与 Secret Access Key (64位精简字符)。";
        } else if (errMsg.includes("notfound") || errMsg.includes("address") || errMsg.includes("getaddrinfo")) {
          statusResult.r2.diagnosticAdvice = "无法连接至主 R2 Endpoint 的物理服务器（网络不通/DNS解析不成功）。常见原因：1. R2_ENDPOINT 端点被不小心错填为存储桶专属的公网访问 URL。请使用不包含 bucket 拼接后缀的统一主域名（如：https://<account-id>.r2.cloudflarestorage.com）。2. 虚拟机容器没有外网连接。";
        } else if (errMsg.includes("nosuchbucket") || errMsg.includes("404")) {
          statusResult.r2.diagnosticAdvice = "连接虽然成功，但指定的云端存储桶 'photox-storage' 似乎在您 Cloudflare 账户中不存在。请查看 R2 仪表盘并确认存储桶名字拼写是否为全小写。";
        } else {
          statusResult.r2.diagnosticAdvice = `未知的 AWS S3 故障码或接口出错。报错信息: ${err.message || err}。请确保您当前使用的后端并不是纯前端静态托管（如 Vercel 静态环境无法读取后端 Node.js 密匙，需要真正的 AI Studio 物理容器）。`;
        }
      }
    } else {
      statusResult.r2.error = "Cloudflare R2 模块所需 credentials 配置缺失，读取到了空值";
      statusResult.status = "error";
      statusResult.r2.diagnosticAdvice = "请在项目的 .env 配置文件、或 AI Studio 开发控制台的环境变量 Settings 板块中，精确配置 R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY、R2_ENDPOINT 的具体参数值。";
    }

    res.json(statusResult);
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
      sendLog('🚀 启动物理链路增量 R2 迁移引擎...', 'info');

      // Setup paths for checkpoint resume files
      const scriptsDir = path.join(process.cwd(), 'scripts');
      if (!fs.existsSync(scriptsDir)) {
        fs.mkdirSync(scriptsDir, { recursive: true });
      }

      const migratedFile = path.join(scriptsDir, 'migrated.json');
      const failedFile = path.join(scriptsDir, 'failed.json');

      let migrated: string[] = [];
      let failed: { id: string; error: string; timestamp: string }[] = [];

      try {
        if (fs.existsSync(migratedFile)) {
          migrated = JSON.parse(fs.readFileSync(migratedFile, 'utf-8'));
          sendLog(`📂 成功导入现有断点记录：已有 ${migrated.length} 张照片迁移过。`, 'info');
        } else {
          fs.writeFileSync(migratedFile, JSON.stringify([], null, 2));
        }
      } catch (err) {
        sendLog('⚠️ 读取断点记录出错，将重设为新记录。', 'info');
        migrated = [];
      }

      try {
        if (fs.existsSync(failedFile)) {
          failed = JSON.parse(fs.readFileSync(failedFile, 'utf-8'));
        }
      } catch (err) {
        failed = [];
      }

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
      
      // 1. 获取照片列表
      sendLog('正在连接 Supabase 拉取最新家具照片数据集...', 'info');
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
      });

      for (let i = 0; i < totalPhotos; i++) {
        const photo = photos![i];

        // Ensure we check connection closed to prevent stray tasks
        if (req.closed || req.destroyed) {
          console.warn('[R2 Migrate SSE] Request closed/aborted by browser client.');
          break;
        }

        // Check if already migrated
        if (migrated.includes(photo.id)) {
          skippedCount++;
          // Periodically log skipped items to avoid flooding but keep users informed
          if (skippedCount === 1 || skippedCount % 5 === 0 || i === totalPhotos - 1) {
            sendLog(`[断点检索] 已跳过第 ${i + 1}/${totalPhotos} 张照片 ${photo.id}（之前已被成功备份至 R2）`, 'info');
          }
          continue;
        }
        
        sendLog(`[进行中 ${i + 1}/${totalPhotos}] 整理数据源：${photo.id}`, 'info');
        
        try {
          if (!photo.image_url) {
            throw new Error(`该行主图 image_url 为空。`);
          }

          // 1. Download Master Image
          sendLog(`  -> 正在拉取主图：${photo.image_url}`, 'info');
          const response = await fetch(photo.image_url);
          if (!response.ok) {
            throw new Error(`主图网络拉取失败，HTTP StatusCode: ${response.status} ${response.statusText}`);
          }
          const imageBuffer = Buffer.from(await response.arrayBuffer());
          
          // 2. Upload Master Image
          const filename = photo.image_url.split('/').pop() || `${photo.id}.webp`;
          const objectKey = `photox/public/${filename}`;
          sendLog(`  -> 正在上传主图至云端 R2: ${objectKey}`, 'info');
          
          await s3Client.send(new PutObjectCommand({
            Bucket: 'photox-storage',
            Key: objectKey,
            Body: imageBuffer,
            ContentType: 'image/webp',
          }));

          // 3. Optional Thumbnail Migration (MirroringmigrateToR2 CLI script)
          if (photo.thumb_url) {
            try {
              sendLog(`  -> 正在拉取对应缩略图：${photo.thumb_url}`, 'info');
              const thumbResponse = await fetch(photo.thumb_url);
              if (thumbResponse.ok) {
                const thumbBuffer = Buffer.from(await thumbResponse.arrayBuffer());
                const thumbFilename = photo.thumb_url.split('/').pop() || `${photo.id}_thumb.webp`;
                const thumbKey = `photox/public/${thumbFilename}`;
                sendLog(`  -> 正在上传缩略图至 R2: ${thumbKey}`, 'info');
                
                await s3Client.send(new PutObjectCommand({
                  Bucket: 'photox-storage',
                  Key: thumbKey,
                  Body: thumbBuffer,
                  ContentType: 'image/webp',
                }));
              } else {
                sendLog(`  ⚠️ 缩略图未能下载 (HTTP ${thumbResponse.status})，将保留原配置项。`, 'info');
              }
            } catch (thumbErr: any) {
              sendLog(`  ⚠️ 缩略图迁移异常 [跳过该辅助文件]: ${thumbErr.message}`, 'info');
            }
          }
          
          // Save progress
          migrated.push(photo.id);
          fs.writeFileSync(migratedFile, JSON.stringify(migrated, null, 2));

          successCount++;
          sendLog(`照片号 ${photo.id} 成功全迁移，断点已标记更新。`, 'success');
          
        } catch (err: any) {
          failCount++;
          const errorMsg = err.message || String(err);
          sendLog(`照片号 ${photo.id} 无法备份：${errorMsg}`, 'error');
          
          // Write down to failed array
          failed.push({
            id: photo.id,
            error: errorMsg,
            timestamp: new Date().toISOString()
          });
          fs.writeFileSync(failedFile, JSON.stringify(failed, null, 2));
        }
      }
      
      sendLog(`========================================`, 'info');
      sendLog(`🎉 迁移流式推送完毕 / Job Stream Finished`, 'success');
      sendLog(`本次成功写入：${successCount} 张，物理断点已持久化`, 'info');
      sendLog(`本次异常失败：${failCount} 张（已单独存储到 failed.json 以供排查）`, 'info');
      sendLog(`由于已有历史标记而自动跳过：${skippedCount} 张`, 'info');
      sendLog(`累计备份总进度：${migrated.length} / ${totalPhotos}`, 'success');
      
      res.write(`data: ${JSON.stringify({ 
        type: "done", 
        success: successCount, 
        fail: failCount, 
        skipped: skippedCount, 
        total: totalPhotos 
      })}\n\n`);
      res.end();
      
    } catch (error: any) {
      sendLog(`增量迁移过程发生全局性未捕获异常: ${error.message || error}`, 'error');
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
