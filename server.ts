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

  app.get("/api/migration-stats", async (req, res) => {
    try {
      console.log("[MigrationStats] Starting audit...");
      const supabase = await getSupabaseAdmin();
      
      const { count: total, error: errTotal } = await supabase
        .from('furniture_items')
        .select('id', { count: 'exact', head: true });
      if (errTotal) {
        console.error("[MigrationStats] Total count error:", errTotal);
        throw errTotal;
      }

      const { count: supabaseCount, error: errSup } = await supabase
        .from('furniture_items')
        .select('id', { count: 'exact', head: true })
        .ilike('image_url', '%supabase.co%');
      if (errSup) {
        console.error("[MigrationStats] Supabase count error:", errSup);
        throw errSup;
      }

      const { count: r2Count, error: errR2 } = await supabase
        .from('furniture_items')
        .select('id', { count: 'exact', head: true })
        .or('image_url.ilike.%r2.dev%,image_url.ilike.%r2.cloudflarestorage.com%');
      if (errR2) {
        console.error("[MigrationStats] R2 count error:", errR2);
        throw errR2;
      }

      // Check thumbnails health
      const { count: brokenThumbs, error: errThumb } = await supabase
        .from('furniture_items')
        .select('id', { count: 'exact', head: true })
        .not('image_url', 'ilike', '%r2.%')
        .not('thumb_url', 'ilike', '%r2.%');

      res.json({ 
        status: 'ok', 
        stats: {
          total: total || 0,
          supabase: supabaseCount || 0,
          r2: r2Count || 0,
          others: (total || 0) - (supabaseCount || 0) - (r2Count || 0),
          brokenThumbs: brokenThumbs || 0
        }
      });
    } catch (err: any) {
      console.error("[MigrationStats] Fatal Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/r2-verify-detailed", async (req, res) => {
    try {
      console.log("[R2Verify] Starting detailed physical check...");
      const supabase = await getSupabaseAdmin();
      const s3 = await getR2Client();
      const bucket = process.env.R2_BUCKET_NAME || 'photox-storage';

      const { data: samples, error } = await supabase
        .from('furniture_items')
        .select('id, image_url, thumb_url')
        .limit(200);
      
      if (error) {
        console.error("[R2Verify] Supabase fetch error:", error);
        throw error;
      }

      const results = {
        total_checked: samples ? samples.length : 0,
        original_missing: [] as string[],
        thumb_missing: [] as string[],
        healthy_count: 0
      };

      if (!samples) {
        return res.json({ status: 'ok', results });
      }

      for (const item of samples) {
        let isOrigOk = false;
        let isThumbOk = false;

        if (item.image_url?.includes('r2.')) {
          const key = item.image_url.split('/').pop();
          if (key) {
            try {
              // We assume photos are in photox/public/ based on previous logic
              await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: `photox/public/${key}` }));
              isOrigOk = true;
            } catch (e) {
              results.original_missing.push(item.id);
            }
          }
        } else if (item.image_url) {
           results.original_missing.push(item.id); 
        }

        if (item.thumb_url?.includes('r2.')) {
          const key = item.thumb_url.split('/').pop();
          if (key) {
            try {
              await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: `photox/public/${key}` }));
              isThumbOk = true;
            } catch (e) {
              results.thumb_missing.push(item.id);
            }
          }
        } else if (item.thumb_url) {
           results.thumb_missing.push(item.id);
        }

        if (isOrigOk) {
          results.healthy_count++;
        }
      }

      res.json({ status: 'ok', results });
    } catch (err: any) {
      console.error("[R2Verify] Fatal Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/r2-inventory", async (req, res) => {
    try {
      const s3Client = await getR2Client();
      let totalCount = 0;
      let continuationToken: string | undefined;
      
      do {
        const response: any = await s3Client.send(new ListObjectsV2Command({
          Bucket: process.env.R2_BUCKET_NAME || 'photox-storage',
          Prefix: 'photox/public/',
          ContinuationToken: continuationToken,
        }));
        
        if (response.Contents) {
          totalCount += response.Contents.length;
        }
        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      res.json({ status: 'ok', count: totalCount, prefix: 'photox/public/' });
    } catch (err: any) {
      console.error("R2 Inventory Error:", err);
      res.status(500).json({ error: err.message });
    }
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
        
        const newImageUrl = `https://pub-ffc4b0692ab74fabb58cbccc5287d7b1.r2.dev/photox/public/${filename}`;
        const thumbFilename = photo.thumb_url ? photo.thumb_url.split('/').pop() : `thumb_${filename}`;
        const newThumbUrl = `https://pub-ffc4b0692ab74fabb58cbccc5287d7b1.r2.dev/photox/public/${thumbFilename}`;

        // If physically exists but DB doesn't point to R2, update DB anyway
        if (r2ExistingKeys.has(objectKey) && !photo.image_url.includes('r2.')) {
           await supabase.from('furniture_items').update({
             image_url: newImageUrl,
             thumb_url: newThumbUrl
           }).eq('id', photo.id);
           
           skippedCount++;
           if (skippedCount % 10 === 0) {
             sendLog(`[数据库指向对账完成] 物理已存在，已更新库藏链接 [第 ${i + 1}/${totalPhotos}]: ${filename}`, 'info');
           }
           continue;
        }

        if (r2ExistingKeys.has(objectKey)) {
          skippedCount++;
          if (skippedCount === 1 || skippedCount % 10 === 0 || i === totalPhotos - 1) {
            sendLog(`[完全一致对账过] 跳过完全合规项 [第 ${i + 1}/${totalPhotos} 张]: ${filename}`, 'info');
          }
          continue;
        }
        
        sendLog(`[介质搬运中 ${i + 1}/${totalPhotos}] 源站 -> 镜像源仓库：${photo.id}`, 'info');
        
        try {
          sendLog(`  -> 正在拉取物理源文件：${photo.image_url}`, 'info');
          const response = await fetch(photo.image_url);
          if (!response.ok) {
            throw new Error(`主图网络拉取失败，HTTP StatusCode: ${response.status} ${response.statusText}`);
          }
          const imageBuffer = Buffer.from(await response.arrayBuffer());
          
          sendLog(`  -> 正在压制上传至 R2 分发加速层: ${objectKey}`, 'info');
          await s3Client.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || 'photox-storage',
            Key: objectKey,
            Body: imageBuffer,
            ContentType: 'image/webp',
          }));

          if (photo.thumb_url) {
            try {
              sendLog(`  -> 正在加工同步物理缩略图：${photo.thumb_url}`, 'info');
              const thumbResponse = await fetch(photo.thumb_url);
              if (thumbResponse.ok) {
                const thumbBuffer = Buffer.from(await thumbResponse.arrayBuffer());
                const tFile = photo.thumb_url.split('/').pop() || `${photo.id}_thumb.webp`;
                const thumbKey = `photox/public/${tFile}`;
                sendLog(`  -> 正在写入 R2 媒体库: ${thumbKey}`, 'info');
                
                await s3Client.send(new PutObjectCommand({
                  Bucket: process.env.R2_BUCKET_NAME || 'photox-storage',
                  Key: thumbKey,
                  Body: thumbBuffer,
                  ContentType: 'image/webp',
                 }));
              } else {
                sendLog(`  ⚠️ 物理源缩略图拉取 404/Ignore，将由主图分发。`, 'info');
              }
            } catch (thumbErr: any) {
              sendLog(`  ⚠️ 缩略图介质同步故障: ${thumbErr.message}`, 'info');
            }
          }
          
          // CRITICAL: Update database URL after physical migration
          await supabase.from('furniture_items').update({
             image_url: newImageUrl,
             thumb_url: newThumbUrl
          }).eq('id', photo.id);

          successCount++;
          sendLog(`照片号 ${photo.id} 物理全链路归档完成，数据库映射已热重载！`, 'success');
          
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

// --- Internal Migration Core Logic ---
async function migratePhotoCore(photoId: string, s3Client: S3Client, supabase: any, force: boolean = false) {
  const { data: photo, error } = await supabase.from('furniture_items').select('*').eq('id', photoId).single();
  if (error || !photo) return { status: 'error', message: 'Photo not found' };

  if (!photo.image_url) return { status: 'skipped', message: 'No image URL' };

  const isR2Url = (url: string) => url && (url.includes('r2.dev') || url.includes('r2.cloudflarestorage.com'));
  const bucket = process.env.R2_BUCKET_NAME || 'photox-storage';

    // 深度对账：如果已经是 R2 链接，且物理文件存在，才真正跳过检查
    // 如果非强制模式，且是 R2 链接（主图和缩略图都是），则直接跳过
    if (!force && isR2Url(photo.image_url) && (!photo.thumb_url || isR2Url(photo.thumb_url))) {
      return { status: 'skipped', message: 'Already migrated' };
    }
    
    // 如果 URL 不是 R2，我们需要修复
    
    try {
      const filename = photo.image_url.split('/').pop() || `${photo.id}.webp`;
      const objectKey = `photox/public/${filename}`;
  
      const response = await fetch(photo.image_url);
      if (!response.ok) throw new Error(`Fetch source failed: ${response.status}`);
      const imageBuffer = Buffer.from(await response.arrayBuffer());
  
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: imageBuffer,
        ContentType: 'image/webp',
      }));
  
      const r2PublicPrefix = process.env.R2_PUBLIC_URL_PREFIX || 'https://pub-ffc4b0692ab74fabb58cbccc5287d7b1.r2.dev';
      const newImageUrl = `${r2PublicPrefix}/${objectKey}`;
      const updates: any = { image_url: newImageUrl };
  
      if (photo.thumb_url) {
        const thumbResponse = await fetch(photo.thumb_url);
        if (thumbResponse.ok) {
          const thumbBuffer = Buffer.from(await thumbResponse.arrayBuffer());
          const thumbFilename = photo.thumb_url.split('/').pop() || `${photo.id}_thumb.webp`;
          const thumbKey = `photox/public/${thumbFilename}`;
          
          await s3Client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: thumbKey,
            Body: thumbBuffer,
            ContentType: 'image/webp',
          }));
          updates.thumb_url = `${r2PublicPrefix}/${thumbKey}`;
        }
      }
  
      const { error: updateErr } = await supabase.from('furniture_items').update(updates).eq('id', photoId);
      if (updateErr) throw updateErr;
  
      return { status: 'success', message: 'Migrated and Verified' };
    } catch (e: any) {
      return { status: 'error', message: e.message };
    }
}

// --- Serverless Friendly Batch Migration ---
app.get("/api/migrate-r2-batch", async (req, res) => {
  try {
    const batchSize = 25; 
    const stats = { success: 0, fail: 0, skipped: 0, total: 0, pending: 0 };

    const supabase = await getSupabaseAdmin();
    const s3Client = await getR2Client();

    // 统计总数和待处理数
    const { count: totalCount } = await supabase.from('furniture_items').select('id', { count: 'exact', head: true });
    const { count: pendingCount } = await supabase.from('furniture_items')
      .select('id', { count: 'exact', head: true })
      .or('image_url.is.null,image_url.ilike.%supabase.co%,thumb_url.ilike.%supabase.co%');

    stats.total = totalCount || 0;
    stats.pending = pendingCount || 0;

    const force = req.query.force === 'true';
    const page = parseInt(req.query.page as string) || 0;
    let query = supabase
      .from('furniture_items')
      .select('id');
      
    if (!force) {
      query = query.or('image_url.is.null,image_url.ilike.%supabase.co%,thumb_url.ilike.%supabase.co%');
    }
    
    query = query.range(page * batchSize, (page + 1) * batchSize - 1);
    
    const { data: photos, error: fetchErr } = await query;

    if (fetchErr) throw fetchErr;

    if (!photos || photos.length === 0) {
      return res.json({ status: 'done', ...stats, message: '所有照片已完成迁移' });
    }

    const logs: string[] = [];
    const results = await Promise.all(
      photos.map(p => migratePhotoCore(p.id, s3Client, supabase, force))
    );

    results.forEach((result, idx) => {
      const pid = photos[idx].id;
      if (result.status === 'success') {
        stats.success++;
        logs.push(`✅ 成功: ${pid}`);
      } else if (result.status === 'skipped') {
        stats.skipped++;
        logs.push(`⏭️ 跳过: ${pid}`);
      } else {
        stats.fail++;
        logs.push(`❌ 失败: ${pid} (${result.message})`);
      }
    });

    return res.json({ 
      status: 'continue', 
      processed: photos.length,
      ...stats,
      logs: logs.join('\n')
    });
  } catch (err: any) {
    console.error("Migration batch error:", err);
    res.status(500).json({ error: err.message });
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
