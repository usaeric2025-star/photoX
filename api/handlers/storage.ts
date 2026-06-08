import { Hono } from "hono";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { getServerEnv } from "../shared/envSchema.js";
import { getR2Client } from "../lib/storage.js";
import { requireRealUser } from "../lib/auth.js";

const serverEnv = getServerEnv(process.env);
export const storage = new Hono();

storage.post("/log-error", async (c) => {
    try {
        const body = await c.req.json();
        const metadata = body.metadata || {};
        const payload = {
            error_message: String(body.error_message || body.message || 'Unknown error').substring(0, 5000),
            stack_trace: body.stack_trace || body.stack || null,
            component_stack: body.component_stack || null,
            url: body.url || '',
            context: metadata.context || body.context || 'global',
            level: metadata.level || body.level || 'error',
            metadata: metadata,
            created_at: new Date().toISOString()
        };
        const supabase = await getSupabaseAdmin();
        const { error } = await supabase
            .from('system_logs')
            .insert([payload]);
        if (error) {
            console.error("Failed to insert system_log:", error);
            return c.json({ success: false, error: error.message }, 500);
        }
        return c.json({ success: true });
    } catch (e: any) {
        console.error("Error logging via /log-error", e);
        return c.json({ success: false, error: e.message }, 500);
    }
});
storage.post("/upload-direct", async (c) => {
    try {
      await requireRealUser(c);
      const { base64Data, fileKey, contentType } = await c.req.json();
      if (!base64Data || !fileKey) return c.json({ error: "base64Data and fileKey required" }, 400);

      let uint8Array: Uint8Array;
      try {
        const buf = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        uint8Array = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
      } catch (err: any) {
        throw new Error('Invalid base64 data');
      }

      const fileName = `photox/public/${fileKey}`;
      const s3Client = await getR2Client();
      const bucketName = serverEnv.R2_BUCKET_NAME;
      if (!bucketName) throw new Error("R2_BUCKET_NAME missing");

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        ContentType: contentType || 'image/webp',
        Body: uint8Array,
      });
      
      await s3Client.send(command);
      
      if (!serverEnv.R2_PUBLIC_URL_PREFIX) throw new Error("R2_PUBLIC_URL_PREFIX missing");
      const publicUrl = `${serverEnv.R2_PUBLIC_URL_PREFIX}/${fileName}`;
      
      return c.json({ success: true, data: { publicUrl } });
    } catch(e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

storage.post("/uploadDirect", async (c) => {
    try {
      await requireRealUser(c);
      const { base64Data, fileKey, contentType } = await c.req.json();
      if (!base64Data || !fileKey) return c.json({ error: "base64Data and fileKey required" }, 400);

      let uint8Array: Uint8Array;
      try {
        const buf = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        uint8Array = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
      } catch (err: any) {
        throw new Error('Invalid base64 data');
      }

      const fileName = `photox/public/${fileKey}`;
      const s3Client = await getR2Client();
      const bucketName = serverEnv.R2_BUCKET_NAME;
      if (!bucketName) throw new Error("R2_BUCKET_NAME missing");

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        ContentType: contentType || 'image/webp',
        Body: uint8Array,
      });
      
      await s3Client.send(command);
      
      if (!serverEnv.R2_PUBLIC_URL_PREFIX) throw new Error("R2_PUBLIC_URL_PREFIX missing");
      const publicUrl = `${serverEnv.R2_PUBLIC_URL_PREFIX}/${fileName}`;
      
      return c.json({ success: true, data: { publicUrl } });
    } catch(e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

storage.post("/upload-presign", async (c) => {
    try {
      await requireRealUser(c);
      const { photoId, fileKey, contentType, imageHash } = await c.req.json();
      if (!photoId && !fileKey) return c.json({ error: "photoId or fileKey required" }, 400);

      // 排重检查
      if (imageHash) {
        const supabase = await getSupabaseAdmin();
        const { data: existing } = await supabase
          .from("furniture_items")
          .select("id, image_url, image_hash")
          .eq("image_hash", imageHash)
          .maybeSingle();
        
        if (existing) {
          if (existing.image_url && (existing.image_url.startsWith('http') || existing.image_url.startsWith('https'))) {
            return c.json({ 
              success: false,
              error: "照片已存在",
              duplicateId: existing.id,
              existingUrl: existing.image_url 
            }, 409);
          }
          
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

storage.post("/r2-delete", async (c) => {
    try {
      await requireRealUser(c);
      const { fileKeys } = await c.req.json();
      if (!fileKeys || !Array.isArray(fileKeys)) {
        return c.json({ success: false, error: "fileKeys array required" }, 400);
      }

      const s3Client = await getR2Client();
      const bucketName = serverEnv.R2_BUCKET_NAME;
      if (!bucketName) throw new Error("R2_BUCKET_NAME missing");

      await Promise.allSettled(fileKeys.map(async (key) => {
          const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: `photox/public/${key}`,
          });
          return s3Client.send(command).catch(err => {
              console.error(`Failed to delete key ${key}:`, err);
          });
      }));

      return c.json({ success: true });
    } catch(e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

function normalizeUrl(u: string) { return u.toLowerCase().trim().split('?')[0].replace(/\/$/, ''); }

const jobStore = new Map<string, any>();

// Audit and Maintenance Routes
storage.get("/storage/audit", async (c) => {
    try {
        const supabase = await getSupabaseAdmin();
        const r2 = await getR2Client();
        const bucket = serverEnv.R2_BUCKET_NAME!;
        const publicUrlPrefix = (serverEnv.R2_PUBLIC_URL_PREFIX || "").replace(/\/$/, '');

        // 1. Get all DB records
        const { data: dbPhotos } = await supabase
            .from("furniture_items")
            .select("id, image_url, name")
            .not("image_url", "is", null);

        const dbRecords = (dbPhotos || []).map(p => ({
            id: p.id,
            name: p.name,
            url: p.image_url,
            normalized: normalizeUrl(p.image_url)
        }));

        const dbNormalizedSet = new Set(dbRecords.map(r => r.normalized));

        // 2. List R2 objects
        const r2KeysSet = new Set<string>();
        let isTruncated = true;
        let continuationToken: string | undefined;

        while (isTruncated) {
            const listCommand = new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: "photox/public/",
                ContinuationToken: continuationToken
            });
            const response = await r2.send(listCommand);
            
            (response.Contents || []).forEach(obj => {
                const key = obj.Key!;
                const isThumb = /thumb|temp|thumbnail|_t\.webp/i.test(key);
                if (!isThumb) {
                    r2KeysSet.add(key);
                }
            });
            
            isTruncated = response.IsTruncated || false;
            continuationToken = response.NextContinuationToken;
        }

        // 3. Categorize
        const orphans: any[] = []; 
        const ghosts: any[] = [];  
        const healthy: any[] = []; 

        r2KeysSet.forEach(key => {
            const publicUrl = publicUrlPrefix.startsWith('http') 
              ? `${publicUrlPrefix}/${key}`
              : `https://${publicUrlPrefix}/${key}`;
            
            if (!dbNormalizedSet.has(normalizeUrl(publicUrl))) {
                orphans.push({ key, url: publicUrl });
            }
        });

        dbRecords.forEach(record => {
            const urlObj = new URL(record.url);
            const key = urlObj.pathname.replace(/^\//, '');
            
            if (r2KeysSet.has(key)) {
                healthy.push(record);
            } else {
                ghosts.push(record);
            }
        });

        return c.json({ 
            success: true, 
            data: { 
                healthyCount: healthy.length,
                orphans: {
                    count: orphans.length,
                    samples: orphans.slice(0, 5)
                },
                ghosts: {
                    count: ghosts.length,
                    samples: ghosts.slice(0, 5)
                }
            } 
        });
    } catch (e: any) {
        console.error("Audit failed:", e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

storage.post("/storage/clean-orphans", async (c) => {
    try {
      await requireRealUser(c);
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

storage.post("/storage/clean", async (c) => {
    try {
      await requireRealUser(c);
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

storage.post("/storage/import-orphans", async (c) => {
    try {
      await requireRealUser(c);
      const supabase = await getSupabaseAdmin();
      const s3Client = await getR2Client();
      const bucket = serverEnv.R2_BUCKET_NAME;
      const publicUrlPrefix = serverEnv.R2_PUBLIC_URL_PREFIX;
      
      if (!bucket || !publicUrlPrefix) throw new Error("Storage config missing");

      let userId: string | undefined;
      try {
        const body = await c.req.json().catch(() => ({}));
        if (body && typeof body === 'object' && body.userId) {
          userId = String(body.userId);
        }
      } catch (err) {}

      if (!userId) {
        const queryUserId = c.req.query("userId");
        if (queryUserId) userId = queryUserId;
      }

      if (!userId) {
        try {
          const { data: session } = await supabase.auth.getSession();
          userId = session?.session?.user?.id;
        } catch (err) {}
      }

      if (!userId || userId === '00000000-0000-0000-0000-000000000000') {
        try {
          const { data: existingItems } = await supabase
            .from('furniture_items')
            .select('user_id')
            .not('user_id', 'is', null)
            .limit(5);
          
          if (existingItems && existingItems.length > 0) {
            for (const item of existingItems) {
              if (item.user_id && item.user_id !== '00000000-0000-0000-0000-000000000000') {
                userId = String(item.user_id);
                break;
              }
            }
          }
        } catch (err) {}
      }

      if (!userId || userId === '00000000-0000-0000-0000-000000000000') {
        try {
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          if (authUsers?.users && authUsers.users.length > 0) {
            const firstUser = authUsers.users.find(u => u.id && u.id !== '00000000-0000-0000-0000-000000000000');
            if (firstUser) userId = firstUser.id;
          }
        } catch (err) {}
      }

      if (!userId || userId === '00000000-0000-0000-0000-000000000000') {
        try {
          const { data: users } = await supabase.from('users').select('id').limit(1);
          userId = users?.[0]?.id || '00000000-0000-0000-0000-000000000000';
        } catch (err) {
          userId = '00000000-0000-0000-0000-000000000000';
        }
      }

      let continuationToken: string | undefined;
      const r2Keys: string[] = [];
      do {
        const list = await s3Client.send(
          new ListObjectsV2Command({ Bucket: bucket, Prefix: "photox/public/", ContinuationToken: continuationToken })
        );
        list.Contents?.forEach(c => { if (c.Key) r2Keys.push(c.Key); });
        continuationToken = list.NextContinuationToken;
      } while (continuationToken);

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

      const orphans = r2Keys.filter(key => {
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

      const jobId = `restore_orphans_${Date.now()}`;
      jobStore.set(jobId, {
        status: 'processing',
        progress: 10,
        processed: 0,
        total: orphans.length,
        message: `开始恢复 ${orphans.length} 张孤儿照片...`
      });

      (async () => {
        const toCreate = [];
        const crypto = await import('node:crypto');
        const importBatch = orphans.slice(0, 50);
        
        for (let i = 0; i < importBatch.length; i++) {
          const key = importBatch[i];
          try {
            const publicUrl = publicUrlPrefix.startsWith('http') 
              ? `${publicUrlPrefix.replace(/\/$/, '')}/${key}`
              : `https://${publicUrlPrefix}/${key}`;
            const filename = key.split('/').pop() || "";
            const nameCandidate = filename.split('.')[0] || "恢复的照片";
            
            if (dbUrls.has(normalizeUrl(publicUrl))) continue;

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
              image_hash: hash,
              user_id: userId
            });
            
            dbUrls.add(normalizeUrl(publicUrl));
            
            const progress = Math.min(10 + Math.round((i / importBatch.length) * 80), 90);
            jobStore.set(jobId, {
              status: 'processing',
              progress,
              processed: i + 1,
              total: orphans.length,
              message: `正在处理: ${filename}`
            });
          } catch (err) {
            console.error(`Failed to process orphan ${key}:`, err);
          }
        }

        if (toCreate.length > 0) {
          const { error } = await supabase.from("furniture_items").insert(toCreate);
          if (error) {
            jobStore.set(jobId, { status: 'failed', progress: 100, error: error.message });
            return;
          }
        }

        jobStore.set(jobId, {
          status: 'completed',
          progress: 100,
          processed: importBatch.length,
          total: orphans.length,
          message: `恢复完成！成功找回 ${toCreate.length} 张照片。系统已自动补全哈希并过滤了缩略图。`
        });
        
        setTimeout(() => jobStore.delete(jobId), 300000);
      })();

      return c.json({ 
        success: true, 
        jobId,
        message: `已启动恢复任务，正在处理 ${Math.min(50, orphans.length)} 条记录...` 
      });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

storage.post("/storage/repair-hashes", async (c) => {
  try {
    await requireRealUser(c);
    const supabase = await getSupabaseAdmin();
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

        const response = await fetch(target.image_url);
        if (!response.ok) continue;

        const buffer = await response.arrayBuffer();
        const hash = crypto.createHash('md5').update(Buffer.from(buffer)).digest('hex');

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
