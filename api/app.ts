import { Hono } from "hono";
import { cors } from "hono/cors";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "./shared/envSchema.js";
import { logTraffic } from "./lib/trafficCapture.js";

// Validate env at module level
const serverEnv = getServerEnv(process.env);

export async function getR2Client() {
  let r2Endpoint = serverEnv.R2_ENDPOINT;
  let r2AccessKeyId = serverEnv.R2_ACCESS_KEY_ID || '';
  let r2SecretAccessKey = serverEnv.R2_SECRET_ACCESS_KEY || '';
  
  if (r2Endpoint && !r2Endpoint.startsWith("http://") && !r2Endpoint.startsWith("https://")) {
    r2Endpoint = `https://${r2Endpoint}`;
  }

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
    maxAttempts: 1,
  });
}

async function getSupabaseAdmin() {
  const supabaseUrl = serverEnv.VITE_SUPABASE_URL || serverEnv.SUPABASE_URL;
  const supabaseKey = serverEnv.SUPABASE_SERVICE_KEY || serverEnv.VITE_SUPABASE_ANON_KEY; 
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials missing");
  }
  return createClient(supabaseUrl, supabaseKey);
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
  
  return c.json({
    success: false,
    error: {
      message: err.message,
      code: 'INTERNAL_SERVER_ERROR'
    }
  }, 500);
});

// --- API Routes ---
app.post("/upload-presign", async (c) => {
    try {
      const { photoId, fileKey, contentType, imageHash } = await c.req.json();
      if (!photoId && !fileKey) return c.json({ error: "photoId or fileKey required" }, 400);

      // 排重检查：查询是否已存在相同 hash 的照片
      if (imageHash) {
        const supabase = await getSupabaseAdmin();
        const { data: existing } = await supabase
          .from("furniture_items")
          .select("id, image_url, image_hash")
          .eq("image_hash", imageHash)
          .maybeSingle();
        
        if (existing) {
          // 只有存在有效 image_url 的才算是真正的重复
          if (existing.image_url && (existing.image_url.startsWith('http') || existing.image_url.startsWith('https'))) {
            return c.json({ 
              success: false,
              error: "照片已存在",
              duplicateId: existing.id,
              existingUrl: existing.image_url 
            }, 409);
          }
          
          // 如果记录存在但没有图片，允许覆盖 (resume 模式)
          // 前端会使用已有的 photoId 继续后续逻辑
          return c.json({ 
            success: true, 
            data: { 
              resuming: true,
              photoId: existing.id,
              uploadUrl: await (async () => {
                const fileName = `photox/public/${existing.id}.webp`;
                const s3Client = await getR2Client();
                const bucketName = serverEnv.R2_BUCKET_NAME;
                const command = new PutObjectCommand({
                  Bucket: bucketName!,
                  Key: fileName,
                  ContentType: contentType || 'image/webp',
                });
                return getSignedUrl(s3Client, command, { expiresIn: 300 });
              })(),
              publicUrl: `${serverEnv.R2_PUBLIC_URL_PREFIX}/photox/public/${existing.id}.webp`
            } 
          });
        }
      }
      
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
});

app.post("/upload/validate", async (c) => {
    try {
      const { imageHash, fileSize, fileName } = await c.req.json();
      if (!imageHash) return c.json({ error: "imageHash required" }, 400);

      const supabase = await getSupabaseAdmin();
      const { data: existing } = await supabase
        .from("furniture_items")
        .select("id, image_url, name, image_hash")
        .eq("image_hash", imageHash)
        .maybeSingle();

      if (existing) {
        const isGhost = !existing.image_url || existing.image_url === '';
        return c.json({ 
          exists: true, 
          isGhost,
          photoId: existing.id,
          existingUrl: existing.image_url 
        });
      }

      return c.json({ exists: false });
    } catch(e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

app.post("/upload-direct", async (c) => {
    try {
      const { base64Data, fileKey, contentType } = await c.req.json();
      if (!base64Data) return c.json({ success: false, error: "base64Data required" }, 400);

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
      
      await s3Client.send(command, { abortSignal: AbortSignal.timeout(8000) });
      
      if (!serverEnv.R2_PUBLIC_URL_PREFIX) throw new Error("R2_PUBLIC_URL_PREFIX missing");
      const publicUrl = `${serverEnv.R2_PUBLIC_URL_PREFIX}/${fileName}`;
      return c.json({ success: true, data: { publicUrl } });
    } catch(e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

app.post("/r2-delete", async (c) => {
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
          return s3Client.send(command, { abortSignal: AbortSignal.timeout(5000) });
      }));
      
      return c.json({ success: true });
    } catch(e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

app.get("/photos", async (c) => {
    try {
      const supabase = await getSupabaseAdmin();
      const { data, error } = await supabase.from("furniture_items").select("*").limit(50);
      if (error) throw error;
      return c.json(data);
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

app.get("/admin/diagnose", async (c) => {
    try {
      const supabase = await getSupabaseAdmin();
      const issues: any[] = [];
      const [
        { data: photos, error: pErr },
        { data: groups, error: gErr },
        { data: categories, error: cErr },
        { data: manufacturers, error: mErr },
      ] = await Promise.all([
        supabase.from("furniture_items").select("id, group_id, category_id, manufacturer_id, image_hash, image_url, thumb_hash, name"),
        supabase.from("groups").select("id, name, member_count"),
        supabase.from("categories").select("id"),
        supabase.from("manufacturers").select("id"),
      ]);

      if (pErr) throw pErr;
      if (!photos) throw new Error("Could not fetch photos");
      
      const groupIds = new Set(groups?.map(g => String(g.id)) || []);
      const categoryIds = new Set(categories?.map(c => String(c.id)) || []);
      const manufacturerIds = new Set(manufacturers?.map(m => String(m.id)) || []);
      
      // Orphaned Photos
      const orphanedPhotos = photos.filter(p => p.group_id && !groupIds.has(String(p.group_id)));
      if (orphanedPhotos.length > 0) {
        issues.push({ id: 'orphaned_photos', category: 'integrity', severity: 'P0', title: '孤儿照片', description: '照片指向了不存在的合组', affectedCount: orphanedPhotos.length, sampleIds: orphanedPhotos.slice(0, 5).map(p => p.id), autoFixable: false });
      }

      // Empty Groups
      const photosByGroup = new Map<string, number>();
      photos.forEach(p => { if (p.group_id) { const gid = String(p.group_id); photosByGroup.set(gid, (photosByGroup.get(gid) || 0) + 1); } });
      const emptyGroups = groups?.filter(g => !photosByGroup.has(String(g.id))) || [];
      if (emptyGroups.length > 0) {
        issues.push({ id: 'empty_groups', category: 'integrity', severity: 'P0', title: '空合组', description: '有些合组中没有任何照片', affectedCount: emptyGroups.length, sampleIds: emptyGroups.slice(0, 5).map(g => String(g.id)), autoFixable: true });
      }

      // Ghost Records (No URL AND No Hash)
      const completeGhosts = photos.filter(p => (!p.image_url || p.image_url === '') && (!p.image_hash || p.image_hash === ''));
      if (completeGhosts.length > 0) {
        issues.push({ 
          id: 'ghost_records', 
          category: 'integrity', 
          severity: 'P0', 
          title: '完全幽灵记录', 
          description: '数据库中有记录但完全没有图片链接和哈希，属于无用垃圾数据', 
          affectedCount: completeGhosts.length, 
          sampleIds: completeGhosts.slice(0, 5).map(p => p.id), 
          autoFixable: true 
        });
      }

      // Incomplete Records (Has URL but No Hash - DANGEROUS TO DELETE)
      const missingHashes = photos.filter(p => p.image_url && (!p.image_hash || p.image_hash.trim() === ''));
      if (missingHashes.length > 0) {
        issues.push({ 
          id: 'missing_hashes', 
          category: 'integrity', 
          severity: 'P1', 
          title: '缺少哈希的记录', 
          description: '这些照片有图片链接但没有哈希值，可能导致排重失效。您可以尝试自动修复（重新计算）或直接删除这些记录。', 
          affectedCount: missingHashes.length, 
          sampleIds: missingHashes.slice(0, 5).map(p => p.id), 
          autoFixable: true 
        });
      }

      // Incomplete Records (Has Hash but No URL - GHOST)
      const missingUrls = photos.filter(p => p.image_hash && (!p.image_url || p.image_url === ''));
      if (missingUrls.length > 0) {
        issues.push({ 
          id: 'missing_urls', 
          category: 'integrity', 
          severity: 'P0', 
          title: '缺少链接的照片', 
          description: '这些记录有哈希但没有图片链接，无法正常显示。', 
          affectedCount: missingUrls.length, 
          sampleIds: missingUrls.slice(0, 5).map(p => p.id), 
          autoFixable: true 
        });
      }

      // member_count mismatch
      const mismatchedGroups = groups?.filter(g => {
         const actualCount = photosByGroup.get(String(g.id)) || 0;
         const storedCount = g.member_count ?? 0;
         return actualCount !== storedCount;
      }) || [];
      if (mismatchedGroups.length > 0) {
         issues.push({ id: 'member_count_mismatch', category: 'consistency', severity: 'P0', title: '成员数不匹配', description: '合组记录的成员数量与实际照片数量不符', affectedCount: mismatchedGroups.length, sampleIds: mismatchedGroups.slice(0, 5).map(g => String(g.id)), autoFixable: true });
      }

      // Photos with temporary URLs
      const tempUrlPhotos = photos.filter(p => p.image_url && p.image_url.includes('/temp-'));
      if (tempUrlPhotos.length > 0) {
        issues.push({ 
          id: 'cleanup_temp_urls', 
          category: 'integrity', 
          severity: 'P1', 
          title: '临时路径未转 UUID', 
          description: `检测到有 ${tempUrlPhotos.length} 张照片仍然使用带有 temp- 标识的临时 R2 文件路径。点击下方按钮可自动将物理 R2 文件名复制重命名为标准照片 UUID，并清理无用临时文件（保证 100% 数据一致性及文件名美化）。`, 
          affectedCount: tempUrlPhotos.length, 
          sampleIds: tempUrlPhotos.slice(0, 5).map(p => p.id), 
          autoFixable: true 
        });
      }

      return c.json({ timestamp: Date.now(), totalIssues: issues.length, issuesBySeverity: { P0: issues.filter(i => i.severity === 'P0').length, P1: issues.filter(i => i.severity === 'P1').length, P2: 0, P3: 0 }, issues });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

app.get("/admin/diagnose-r2", async (c) => {
    try {
      const issues: string[] = [];
      const envKeys = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL_PREFIX"];
      const configState: Record<string, any> = {};
      
      for (const key of envKeys) {
        const val = process.env[key] || (serverEnv as any)[key];
        configState[key] = { exists: !!val, length: val ? String(val).length : 0 };
        if (!val) issues.push(`环境变量 ${key} 缺失`);
      }

      if (issues.length > 0) return c.json({ success: false, stage: "env_check", error: "存储配置不完整", details: { issues, configState } });

      let s3Client;
      try {
        s3Client = await getR2Client();
      } catch (clientErr: any) {
        return c.json({ success: false, stage: "instantiation", error: clientErr.message, details: { configState } });
      }

      try {
        const bucketName = serverEnv.R2_BUCKET_NAME;
        const command = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 });
        await s3Client.send(command, { abortSignal: AbortSignal.timeout(4000) });
      } catch (s3Err: any) {
        return c.json({ success: false, stage: "connection", error: s3Err.message, details: { configState, s3Message: s3Err.message } });
      }

      return c.json({ success: true, stage: "ready", message: "R2 连接成功！", details: { configState } });
    } catch (globalErr: any) {
      return c.json({ success: false, error: globalErr.message });
    }
});

app.post("/admin/repair", async (c) => {
    try {
      const { issueId } = await c.req.json();
      const supabase = await getSupabaseAdmin();
      
      if (issueId === 'member_count_mismatch') {
         const { data: photos } = await supabase.from("furniture_items").select("group_id");
         const counts = new Map<string, number>();
         photos?.forEach(p => { if (p.group_id) { const gid = String(p.group_id); counts.set(gid, (counts.get(gid) || 0) + 1); } });
         const { data: groups } = await supabase.from("groups").select("id");
         if (groups) await Promise.all(groups.map(g => supabase.from("groups").update({ member_count: counts.get(String(g.id)) || 0 }).eq("id", g.id)));
         return c.json({ success: true, message: '成员数同步完成' });
      }

      if (issueId === 'empty_groups') {
         const { data: photos } = await supabase.from("furniture_items").select("group_id");
         const photoGroupIds = new Set(photos?.map(p => String(p.group_id)).filter(Boolean));
         const { data: groups } = await supabase.from("groups").select("id");
         const emptyGroupIds = groups?.filter(g => !photoGroupIds.has(String(g.id))).map(g => g.id) || [];
         if (emptyGroupIds.length > 0) await supabase.from("groups").delete().in("id", emptyGroupIds);
         return c.json({ success: true, message: `清理了 ${emptyGroupIds.length} 个空合组` });
      }

      if (issueId === 'ghost_records') {
        const { data: ghosts } = await supabase
          .from("furniture_items")
          .select("id")
          .is("image_url", null)
          .is("image_hash", null);
        
        const ids = ghosts?.map(g => g.id) || [];
        if (ids.length > 0) {
          const { error } = await supabase.from("furniture_items").delete().in("id", ids);
          if (error) throw error;
        }
        return c.json({ success: true, message: `完全幽灵记录清理完成: ${ids.length}条` });
      }

      if (issueId === 'missing_urls') {
        // Only delete records that have NO URL and NO meaningful data
        const { data: records } = await supabase
          .from("furniture_items")
          .select("id")
          .is("image_url", null);

        const ids = records?.map(r => r.id) || [];
        if (ids.length > 0) {
          const { error } = await supabase.from("furniture_items").delete().in("id", ids);
          if (error) throw error;
        }
        return c.json({ success: true, message: `无链接记录清理完成: ${ids.length}条` });
      }

      if (issueId === 'missing_hashes') {
        const { data: targets } = await supabase
          .from("furniture_items")
          .select("id, image_url")
          .or('image_hash.is.null,image_hash.eq.""')
          .not("image_url", "is", null)
          .limit(20);

        if (!targets || targets.length === 0) return c.json({ success: true, message: '没有发现缺失哈希的记录' });

        let repairedCount = 0;
        const crypto = await import('node:crypto');
        
        for (const photo of targets) {
          try {
            const response = await fetch(photo.image_url);
            if (!response.ok) continue;
            const buffer = await response.arrayBuffer();
            const hash = crypto.createHash('md5').update(Buffer.from(buffer)).digest('hex');
            await supabase.from("furniture_items").update({ image_hash: hash }).eq("id", photo.id);
            repairedCount++;
          } catch (e) {
            console.error(`Repair failed for ${photo.id}:`, e);
          }
        }
        return c.json({ success: true, message: `已修复 ${repairedCount} 条哈希记录` });
      }

      if (issueId === 'force_delete_missing_hashes') {
        const { data: targets } = await supabase
          .from("furniture_items")
          .select("id")
          .or('image_hash.is.null,image_hash.eq.""');
        
        const ids = targets?.map(t => t.id) || [];
        if (ids.length > 0) {
          const { error } = await supabase.from("furniture_items").delete().in("id", ids);
          if (error) throw error;
        }
        return c.json({ success: true, message: `已强制删除 ${ids.length} 条缺失哈希的损坏记录` });
      }

      if (issueId === 'cleanup_redundant') {
        const allPhotos: any[] = [];
        let fromIdx = 0;
        const stepIdx = 1000;
        let hasMoreRows = true;

        while (hasMoreRows) {
          const { data: batch, error: batchError } = await supabase
            .from('furniture_items')
            .select('id, image_url, group_id, is_hidden, name, photo_tags(tag_id), created_at')
            .order('created_at', { ascending: true })
            .range(fromIdx, fromIdx + stepIdx - 1);
          
          if (batchError) throw batchError;
          if (!batch || batch.length === 0) {
            hasMoreRows = false;
          } else {
            allPhotos.push(...batch);
            fromIdx += stepIdx;
            if (batch.length < stepIdx) hasMoreRows = false;
          }
        }
        
        const urlGroups = new Map<string, any[]>();
        const normalize = (u: string) => u.toLowerCase().trim().split('?')[0].replace(/\/$/, '');
        
        allPhotos.forEach(p => {
          if (!p.image_url) return;
          const normalized = normalize(p.image_url);
          if (!urlGroups.has(normalized)) urlGroups.set(normalized, []);
          urlGroups.get(normalized)!.push(p);
        });

        const toDelete: string[] = [];

        for (const [_, group] of urlGroups) {
          if (group.length <= 1) continue;

          // Smart Selection: Prioritize records with more data
          const best = group.reduce((best, current) => {
            // Priority 1: Has group_id
            if (current.group_id && !best.group_id) return current;
            if (!current.group_id && best.group_id) return best;

            // Priority 2: Custom name (not containing recovery placeholder)
            const isCurrentRecovery = current.name?.includes('恢复的照片');
            const isBestRecovery = best.name?.includes('恢复的照片');
            if (isBestRecovery && !isCurrentRecovery) return current;
            if (!isBestRecovery && isCurrentRecovery) return best;

            // Priority 3: Visible vs Hidden
            if (best.is_hidden && !current.is_hidden) return current;
            
            // Priority 4: Has tags
            const currentTags = current.photo_tags?.length || 0;
            const bestTags = best.photo_tags?.length || 0;
            if (currentTags > bestTags) return current;
            
            // Default: Earliest wins
            return best;
          }, group[0]);

          group.forEach(r => {
            if (r.id !== best.id) toDelete.push(r.id);
          });
        }

        if (toDelete.length > 0) {
          for (let i = 0; i < toDelete.length; i += 100) {
            const batch = toDelete.slice(i, i + 100);
            await supabase.from('furniture_items').delete().in('id', batch);
          }
        }
        
        return c.json({ success: true, message: `已成功合并并清理了 ${toDelete.length} 条重复记录，保留了包含元数据的优质版本。` });
      }

      if (issueId === 'diagnose_worker') {
        const { testImageUrl } = await c.req.json();
        const workerUrl = (serverEnv as any).VITE_THUMBNAIL_WORKER_URL || process.env.VITE_THUMBNAIL_WORKER_URL;
        if (!workerUrl) {
          return c.json({ success: false, error: "未在服务器检测到 VITE_THUMBNAIL_WORKER_URL 环境变量，请在 Vercel 后台设置并重新部署" });
        }

        const base = workerUrl.replace(/\/$/, '');
        let targetUrl = base;
        let isRealImage = false;

        if (testImageUrl) {
          try {
            const urlObj = new URL(testImageUrl);
            const path = urlObj.pathname;
            targetUrl = `${base}${path.startsWith('/') ? path : '/' + path}?w=200&h=200`;
            isRealImage = true;
          } catch (e) {}
        } else {
          // If no test image, try to find one random image from DB to test "real" connectivity
          const { data: randomPhoto } = await supabase
            .from('furniture_items')
            .select('image_url')
            .limit(1)
            .single();
          
          if (randomPhoto?.image_url) {
            try {
              const urlObj = new URL(randomPhoto.image_url);
              const path = urlObj.pathname;
              targetUrl = `${base}${path.startsWith('/') ? path : '/' + path}?w=200&h=200`;
              isRealImage = true;
            } catch (e) {}
          }
        }

        const start = performance.now();
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          
          const res = await fetch(targetUrl, { 
            method: 'GET',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const end = performance.now();
          
          if (!res.ok) {
            return c.json({ 
                success: false, 
                error: `Worker 响应异常 (HTTP ${res.status}): ${res.statusText || 'Unknown Error'}`,
                data: {
                  status: res.status,
                  statusText: res.statusText,
                  url: targetUrl,
                  isRealImage
                }
            });
          }

          const contentType = res.headers.get('content-type');

          return c.json({ 
            success: true, 
            data: {
              status: res.status,
              statusText: res.statusText,
              latency: Math.round(end - start),
              url: targetUrl,
              contentType,
              isRealImage
            }
          });
        } catch (e: any) {
          return c.json({ success: false, error: `Worker 连通性异常: ${e.message}. 请检查 URL 是否正确及 Worker 是否已部署。` });
        }
      }

      function cleanPath(p: string) {
        return p.startsWith('/') ? p : `/${p}`;
      }

      if (issueId === 'cleanup_temp_urls') {
        const { data: targets, error: fetchError } = await supabase
          .from("furniture_items")
          .select("id, image_url")
          .like("image_url", "%/temp-%")
          .limit(100); // Process in batches of 100 to avoid timeouts
        
        if (fetchError) throw fetchError;
        if (!targets || targets.length === 0) {
          return c.json({ success: true, count: 0, message: "没有发现需要重命名的临时 URL 记录" });
        }

        const s3Client = await getR2Client();
        const bucket = serverEnv.R2_BUCKET_NAME;
        const publicUrlPrefix = serverEnv.R2_PUBLIC_URL_PREFIX;
        if (!bucket || !publicUrlPrefix) throw new Error("Storage config missing");

        const { CopyObjectCommand, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
        let successCount = 0;
        let failCount = 0;

        for (const photo of targets) {
          try {
            if (!photo.image_url) continue;

            const urlObj = new URL(photo.image_url);
            const rawPath = urlObj.pathname;
            const sourceKey = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;

            // Target key: photox/public/${photo.id}.webp
            const targetKey = `photox/public/${photo.id}.webp`;

            // 1. Copy object in R2
            await s3Client.send(new CopyObjectCommand({
              Bucket: bucket,
              CopySource: `${bucket}/${sourceKey}`, // CopySource format: bucket-name/key
              Key: targetKey
            }));

            // 2. Generate new public URL
            const newPublicUrl = publicUrlPrefix.startsWith('http') 
              ? `${publicUrlPrefix.replace(/\/$/, '')}/${targetKey}`
              : `https://${publicUrlPrefix}/${targetKey}`;

            // 3. Update DB
            const { error: updateError } = await supabase
              .from("furniture_items")
              .update({ image_url: newPublicUrl, updated_at: new Date().toISOString() })
              .eq("id", photo.id);

            if (updateError) throw updateError;

            // 4. Delete old object in R2
            await s3Client.send(new DeleteObjectCommand({
              Bucket: bucket,
              Key: sourceKey
            }));

            successCount++;
          } catch (err) {
            console.error(`Failed to rename photo ${photo.id} in R2:`, err);
            failCount++;
          }
        }

        return c.json({ 
          success: true, 
          count: successCount,
          failed: failCount,
          message: `成功处理了 ${successCount} 张临时路径照片。已将存储文件名安全升级为标准 UUID，并更新数据库链接！`
        });
      }

      if (issueId === 'diagnose_r2') {
        const res = await fetch(`${c.req.url.split('/admin')[0]}/admin/diagnose-r2`);
        const data = await res.json();
        return c.json(data);
      }

      return c.json({ success: false, error: 'Unsupported repair' }, 400);
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

app.get("/health", (c) => {
    return c.json({ success: true, data: { status: "ok", uptime: process.uptime(), timestamp: Date.now() } });
});

app.get("/storage/audit", async (c) => {
    try {
      const supabase = await getSupabaseAdmin();
      const s3Client = await getR2Client();
      const bucket = serverEnv.R2_BUCKET_NAME;
      const publicUrlPrefix = serverEnv.R2_PUBLIC_URL_PREFIX;
      if (!bucket || !publicUrlPrefix) throw new Error("Storage config missing");

      // 1. Helper to filter thumbnails and temp files
      const isExtraFile = (key: string) => {
        const lower = key.toLowerCase();
        return (
          lower.includes('thumb') || 
          lower.includes('temp') || 
          lower.includes('/thumbnails/') || 
          lower.endsWith('_t.webp') ||
          lower.includes('thumb_') ||
          lower.includes('thumb-')
        );
      };

      // 2. Support pagination for full DB coverage
      const photos: any[] = [];
      let fromIdx = 0;
      const stepIdx = 1000;
      let hasMoreRows = true;

      while (hasMoreRows) {
        const { data: batch, error: batchError } = await supabase
          .from("furniture_items")
          .select("id, image_url, image_hash")
          .range(fromIdx, fromIdx + stepIdx - 1);
        
        if (batchError) throw batchError;
        if (!batch || batch.length === 0) {
          hasMoreRows = false;
        } else {
          photos.push(...batch);
          fromIdx += stepIdx;
          if (batch.length < stepIdx) hasMoreRows = false;
        }
      }

      // 3. Scan R2 for all original files (with pagination)
      let continuationToken: string | undefined;
      const r2Files: { key: string; url: string }[] = [];
      do {
        const list: any = await s3Client.send(new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: "photox/public/",
          ContinuationToken: continuationToken,
        }));
        
        if (list.Contents) {
          list.Contents.forEach((obj: any) => {
            if (obj.Key && !isExtraFile(obj.Key)) {
              const url = publicUrlPrefix.startsWith('http') 
                ? `${publicUrlPrefix.replace(/\/$/, '')}/${obj.Key}`
                : `https://${publicUrlPrefix}/${obj.Key}`;
              r2Files.push({ key: obj.Key, url });
            }
          });
        }
        continuationToken = list.NextContinuationToken;
      } while (continuationToken);

      // 4. Build lookups
      const normalize = (u: string) => u.toLowerCase().trim().split('?')[0].replace(/\/$/, '');
      const dbUrls = new Set(photos.map(p => p.image_url ? normalize(p.image_url) : null).filter(Boolean));
      const r2Urls = new Set(r2Files.map(f => normalize(f.url)));

      // 5. Analyze
      const orphanFiles = r2Files.filter(f => !dbUrls.has(normalize(f.url)));
      const missingRecords = photos.filter(p => p.image_url && !r2Urls.has(normalize(p.image_url)));

      return c.json({ 
        success: true, 
        data: { 
          healthy: photos.length - missingRecords.length,
          missing: missingRecords.length, 
          orphans: orphanFiles.length,
          missingIds: missingRecords.slice(0, 100).map(r => r.id),
          orphanKeys: orphanFiles.slice(0, 100).map(f => f.key),
          totalR2Records: r2Files.length,
          totalDbRecords: photos.length,
          isHealthy: orphanFiles.length === 0 && missingRecords.length === 0,
          summary: `对账报告：数据库记录 ${photos.length} 条，R2 原图 ${r2Files.length} 个。检测到 ${orphanFiles.length} 个离散文件，${missingRecords.length} 条数据库记录丢失。`
        } 
      });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

app.post("/storage/clean-orphans", async (c) => {
    try {
      const supabase = await getSupabaseAdmin();
      const { data: orphans, error } = await supabase
        .from("furniture_items")
        .select("id")
        .or('image_url.is.null,image_url.eq.""');

      if (error) throw error;
      if (!orphans || orphans.length === 0) {
        return c.json({ success: true, count: 0 });
      }

      const ids = orphans.map(o => o.id);
      const { error: delError } = await supabase
        .from("furniture_items")
        .delete()
        .in("id", ids);

      if (delError) throw delError;
      return c.json({ success: true, count: ids.length, ids });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

app.post("/storage/clean", async (c) => {
    try {
      const supabase = await getSupabaseAdmin();
      const s3Client = await getR2Client();
      const bucket = serverEnv.R2_BUCKET_NAME;
      if (!bucket) throw new Error("R2_BUCKET_NAME missing");

      const { data: photos, error } = await supabase.from("furniture_items").select("image_url");
      if (error) throw error;

      const dbFiles: Set<string> = new Set();
      photos.forEach(p => {
        if (p.image_url?.includes("r2")) dbFiles.add(p.image_url.split("/").pop()!);
      });

      const r2FilesToClean: string[] = [];
      let continuationToken: string | undefined;
      do {
        const list = await s3Client.send(
          new ListObjectsV2Command({ Bucket: bucket, Prefix: "photox/public/", ContinuationToken: continuationToken }),
          { abortSignal: AbortSignal.timeout(6000) }
        );
        list.Contents?.forEach(c => {
          if (c.Key) {
            const filename = c.Key.split("/").pop();
            if (filename && !dbFiles.has(filename)) r2FilesToClean.push(c.Key);
          }
        });
        continuationToken = list.NextContinuationToken;
      } while (continuationToken);

      if (r2FilesToClean.length > 0) {
        await Promise.all(r2FilesToClean.map(async (key) => {
          return s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: AbortSignal.timeout(4000) });
        }));
      }

      return c.json({ success: true, count: r2FilesToClean.length, files: r2FilesToClean });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

app.post("/storage/import-orphans", async (c) => {
    try {
      const supabase = await getSupabaseAdmin();
      const s3Client = await getR2Client();
      const bucket = serverEnv.R2_BUCKET_NAME;
      const publicUrlPrefix = serverEnv.R2_PUBLIC_URL_PREFIX;
      
      if (!bucket || !publicUrlPrefix) throw new Error("Storage config missing");

      // 1. Normalize URL helper
      const normalizeUrl = (u: string) => u.toLowerCase().trim().split('?')[0].replace(/\/$/, '');

      // 2. Get all R2 files
      let continuationToken: string | undefined;
      const r2Keys: string[] = [];
      do {
        const list = await s3Client.send(
          new ListObjectsV2Command({ Bucket: bucket, Prefix: "photox/public/", ContinuationToken: continuationToken })
        );
        list.Contents?.forEach(c => { if (c.Key) r2Keys.push(c.Key); });
        continuationToken = list.NextContinuationToken;
      } while (continuationToken);

      // 3. Get all DB URLs (original and thumbnails, support full pagination)
      const dbUrls = new Set<string>();
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error: fetchError } = await supabase
          .from("furniture_items")
          .select("image_url")
          .range(from, from + step - 1);
        
        if (fetchError) throw fetchError;
        if (!batch || batch.length === 0) {
          hasMore = false;
        } else {
          batch.forEach(p => {
            if (p.image_url) dbUrls.add(normalizeUrl(p.image_url));
          });
          from += step;
          if (batch.length < step) hasMore = false;
        }
      }

      // 4. Find unique orphans
      const orphans = r2Keys.filter(key => {
        // Robust thumbnail and temp file filtering
        const lowers = key.toLowerCase();
        if (
          lowers.includes('thumb') || 
          lowers.includes('temp') || 
          lowers.includes('/thumbnails/') || 
          lowers.endsWith('_t.webp') ||
          lowers.includes('thumb_') ||
          lowers.includes('thumb-')
        ) return false;

        const publicUrl = publicUrlPrefix.startsWith('http') 
          ? `${publicUrlPrefix.replace(/\/$/, '')}/${key}`
          : `https://${publicUrlPrefix}/${key}`;
        
        return !dbUrls.has(normalizeUrl(publicUrl));
      });

      if (orphans.length === 0) {
        return c.json({ success: true, count: 0, message: "所有云端文件已与数据库对齐，无需恢复" });
      }

      // 5. Create DB records (Batch size 50)
      const toCreate = [];
      const crypto = await import('node:crypto');
      const importBatch = orphans.slice(0, 50);
      
      for (const key of importBatch) {
        try {
          const publicUrl = publicUrlPrefix.startsWith('http') 
            ? `${publicUrlPrefix.replace(/\/$/, '')}/${key}`
            : `https://${publicUrlPrefix}/${key}`;
          const filename = key.split('/').pop() || "";
          const nameCandidate = filename.split('.')[0] || "恢复的照片";
          
          // Double check normalization in a local set for this batch to prevent concurrent overlaps
          if (dbUrls.has(normalizeUrl(publicUrl))) continue;

          // Calculate Hash
          const response = await fetch(publicUrl);
          let hash = null;
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            hash = crypto.createHash('md5').update(Buffer.from(buffer)).digest('hex');
          }

          toCreate.push({
            name: nameCandidate,
            image_url: publicUrl,
            description: `[自动恢复] 源文件: ${filename}`,
            is_hidden: false, 
            image_hash: hash 
          });
          
          // Mark as seen for immediate next checks
          dbUrls.add(normalizeUrl(publicUrl));
        } catch (err) {
          console.error(`Failed to process orphan ${key}:`, err);
        }
      }

      if (toCreate.length > 0) {
        const { error } = await supabase.from("furniture_items").insert(toCreate);
        if (error) throw error;
      }

      return c.json({ 
        success: true, 
        count: toCreate.length, 
        remaining: orphans.length - importBatch.length,
        message: `成功从云端找回并导入了 ${toCreate.length} 张照片。系统已自动补全哈希并过滤了缩略图。` 
      });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

/**
 * [LONG-TERM-FIX] Repair Missing Hashes
 * Downloads the image, calculates hash, and updates the DB.
 */
app.post("/storage/repair-hashes", async (c) => {
  try {
    const supabase = await getSupabaseAdmin();
    // 1. Find records with URL but no hash (Check both null and empty string)
    const { data: targets, error: fetchError } = await supabase
      .from("furniture_items")
      .select("id, image_url, image_hash")
      .or('image_hash.is.null,image_hash.eq.""')
      .not("image_url", "is", null)
      .limit(20); 

    if (fetchError) throw fetchError;
    if (!targets || targets.length === 0) {
      return c.json({ success: true, count: 0, message: "没有发现需要修复哈希的记录" });
    }

    let repairedCount = 0;
    const crypto = await import('node:crypto');

    for (const target of targets) {
      try {
        if (!target.image_url) continue;

        // Fetch the image
        const response = await fetch(target.image_url);
        if (!response.ok) continue;

        const buffer = await response.arrayBuffer();
        const hash = crypto.createHash('md5').update(Buffer.from(buffer)).digest('hex');

        // Update DB
        await supabase
          .from("furniture_items")
          .update({ image_hash: hash })
          .eq("id", target.id);
        
        repairedCount++;
      } catch (err) {
        console.error(`Failed to repair hash for ${target.id}:`, err);
      }
    }

    return c.json({ 
      success: true, 
      count: repairedCount,
      message: `成功修复了 ${repairedCount} 条记录的哈希值`
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.post("/ai/analyze", async (c) => {
    try {
      const { base64Image, customModel, promptText } = await c.req.json();
      const apiKey = serverEnv.GEMINI_API_KEY;
      if (!apiKey) return c.json({ error: "Server API key not configured" }, 500);
      const modelName = customModel || "google/gemini-1.5-flash";
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "X-Title": "PhotoX AI" },
        body: JSON.stringify({ model: modelName.replace('openrouter/', ''), messages: [{ role: "user", content: [{ type: "text", text: promptText }, { type: "image_url", image_url: { url: base64Image } } ] }], response_format: { type: "json_object" }, max_tokens: 1024 })
      });
      if (!response.ok) return c.json({ error: await response.text() }, response.status as any);
      return c.json(await response.json());
    } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.post("/ai/translate", async (c) => {
    try {
      const { customModel, promptText } = await c.req.json();
      const apiKey = serverEnv.GEMINI_API_KEY;
      if (!apiKey) return c.json({ error: "Server API key not configured" }, 500);
      const modelName = customModel || "google/gemini-1.5-flash";
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: modelName.replace('openrouter/', ''), messages: [{ role: "user", content: promptText }], max_tokens: 1000 })
      });
      if (!response.ok) return c.json({ error: await response.text() }, response.status as any);
      const data = await response.json();
      return c.json(JSON.parse(data.choices[0]?.message?.content || "{}"));
    } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.post("/ai/analyze-group", async (c) => {
    try {
      const { photoDetails } = await c.req.json();
      const apiKey = serverEnv.GEMINI_API_KEY;
      if (!apiKey) return c.json({ error: "Server API key not configured" }, 500);
      const prompt = `你是一个产品分析专家...分析结果以JSON返回...${photoDetails}`;
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" }, max_tokens: 1000 })
      });
      if (!response.ok) return c.json({ error: await response.text() }, response.status as any);
      const data = await response.json();
      return c.json(JSON.parse(data.choices[0]?.message?.content || "{}"));
    } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.post("/ai/analyze-photo-v2", async (c) => {
    try {
      const { photoDetail } = await c.req.json();
      const apiKey = serverEnv.GEMINI_API_KEY;
      if (!apiKey) return c.json({ error: "Server API key not configured" }, 500);
      const prompt = `你是一个产品分析专家...分析结果以JSON返回...${photoDetail}`;
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" }, max_tokens: 1000 })
      });
      if (!response.ok) return c.json({ error: await response.text() }, response.status as any);
      const data = await response.json();
      return c.json(JSON.parse(data.choices[0]?.message?.content || "{}"));
    } catch (error: any) { return c.json({ error: error.message }, 500); }
});

export type AppType = typeof app;
