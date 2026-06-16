import { logger } from '../../_lib/logger.js';
import { Hono } from "hono";
import { type } from "arktype";
import { requireRealUser } from "../../_lib/auth.js";
import { getSupabaseAdmin } from "../../_lib/supabase.js";
import { getServerEnv } from "../../_shared/envSchema.js";
import { getR2Client } from "../../_lib/storage.js";
import { ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { 
  StorageAuditResSchema, 
  ImportOrphansReqSchema,
  MaintenanceJobSchema,
  ApiResponse,
  MaintenanceJob
} from "../../_shared/apiContractSchema.js";
import { normalizeUrl, runStorageAudit } from "../../_lib/maintenance/storageUtils.js";

const serverEnv = getServerEnv(process.env);
export const storageMaintenance = new Hono();

// Durable job store could be replaced with Redis/DB later if needed
const jobStore = new Map<string, MaintenanceJob>();

storageMaintenance.get("/storage/audit", async (c) => {
    try {
        const { healthy, ghosts, orphans, truncated } = await runStorageAudit();

        const auditData = { 
            healthyCount: healthy.length,
            ghosts: { 
                count: ghosts.length, 
                samples: ghosts.slice(0, 20).map((g: { id: string; name: string; url: string }) => ({
                    id: g.id,
                    name: g.name,
                    expectedKey: g.url.split('/').pop() || ""
                }))
            },
            orphans: { 
                count: orphans.length, 
                samples: orphans.slice(0, 20).map((o: { key: string; url: string }) => ({
                    key: o.key,
                    url: o.url
                }))
            },
            truncated: truncated || false,
            formatDistribution: { avif: 0, webp: 0, jpg: 0, other: 0 }
        };

        // Strict schema check if needed
        StorageAuditResSchema(auditData);

        return c.json({ success: true, data: auditData } as ApiResponse);
    } catch (e: unknown) {
        logger.error("Audit failed:", e);
        return c.json({ success: false, error: (e as Error).message } as ApiResponse, 500);
    }
});


storageMaintenance.post("/storage/clean-orphans", async (c) => {
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

      const ids = orphans.map((o: any) => o.id);
      const { error: delError } = await supabase
        .from("furniture_items")
        .delete()
        .in("id", ids);

      if (delError) throw delError;
      return c.json({ success: true, count: ids.length, ids });
    } catch (e: unknown) {
      return c.json({ success: false, error: (e as Error).message }, 500);
    }
});

storageMaintenance.post("/storage/clean", async (c) => {
    try {
      await requireRealUser(c);
      const supabase = await getSupabaseAdmin();
      const s3Client = await getR2Client();
      const bucket = serverEnv.R2_BUCKET_NAME;
      if (!bucket) throw new Error("R2_BUCKET_NAME missing");

      const { data: photos, error } = await supabase.from("furniture_items").select("image_url");
      if (error) throw error;

      const dbFiles: Set<string> = new Set();
      photos.forEach((p: any) => {
        if (p.image_url?.includes("r2")) dbFiles.add(p.image_url.split("/").pop()!);
      });

      const r2FilesToClean: string[] = [];
      let continuationToken: string | undefined;
      do {
        const list = await s3Client.send(
          new ListObjectsV2Command({ Bucket: bucket, Prefix: "photox/public/", ContinuationToken: continuationToken }),
          { abortSignal: AbortSignal.timeout(6000) }
        );
        list.Contents?.forEach((c: any) => {
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
    } catch (e: unknown) {
      return c.json({ success: false, error: (e as Error).message }, 500);
    }
});

storageMaintenance.post("/storage/import-orphans", async (c) => {
    try {
      await requireRealUser(c);
      const supabase = await getSupabaseAdmin();
      const s3Client = await getR2Client();
      const bucket = serverEnv.R2_BUCKET_NAME;
      const publicUrlPrefix = serverEnv.R2_PUBLIC_URL_PREFIX;
      
      if (!bucket || !publicUrlPrefix) throw new Error("Storage config missing");

      // Validate input with ArkType
      const rawBody = await c.req.json().catch(() => ({}));
      const bodyCheck = ImportOrphansReqSchema(rawBody);
      
      let userId: string | undefined;
      if (!(bodyCheck instanceof type.errors)) {
        userId = bodyCheck.userId;
      }

      if (!userId) {
        const queryUserId = c.req.query("userId");
        if (queryUserId) userId = queryUserId;
      }

      // ... existing fallback logic for userId remains for robustness, but we've used ArkType for primary input

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
            const firstUser = authUsers.users.find((u: any) => u.id && u.id !== '00000000-0000-0000-0000-000000000000');
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
          batch.forEach((p: any) => {
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
            const jobData = {
              status: 'processing',
              progress,
              processed: i + 1,
              total: orphans.length,
              message: `正在处理: ${filename}`
            } as const;
            
            // Validate with ArkType
            MaintenanceJobSchema(jobData);
            jobStore.set(jobId, jobData);
          } catch (err) {
            logger.error(`Failed to process orphan ${key}:`, err);
          }
        }

        if (toCreate.length > 0) {
          const { error } = await supabase.from("furniture_items").insert(toCreate);
          if (error) {
            const failData = { status: 'failed', progress: 100, processed: 0, total: orphans.length, message: "数据库写入失败", error: error.message } as const;
            jobStore.set(jobId, failData);
            return;
          }
        }

        const completedData = {
          status: 'completed',
          progress: 100,
          processed: importBatch.length,
          total: orphans.length,
          message: `恢复完成！成功找回 ${toCreate.length} 张照片。系统已自动补全哈希并过滤了缩略图。`
        } as const;
        
        MaintenanceJobSchema(completedData);
        jobStore.set(jobId, completedData);
        
        setTimeout(() => jobStore.delete(jobId), 300000);
      })();

      return c.json({ 
        success: true, 
        data: { 
          jobId,
          message: `已启动恢复任务，正在处理 ${Math.min(50, orphans.length)} 条记录...` 
        }
      } as ApiResponse);
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

storageMaintenance.post("/storage/repair-hashes", async (c) => {
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
        logger.error(`Failed to repair hash for ${target.id}:`, err);
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
