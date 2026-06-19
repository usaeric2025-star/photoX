import { logger } from '../../_lib/logger.js';
import { Hono } from "hono";
import { type } from "arktype";
import { requireRealUser } from "../../_lib/auth.js";
import { db, furnitureItems } from '../../_lib/db/index.js';
import { eq, or, isNull, inArray, sql } from "drizzle-orm";
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
      const orphans = await db.select({ id: furnitureItems.id })
        .from(furnitureItems)
        .where(or(isNull(furnitureItems.imageUrl), eq(furnitureItems.imageUrl, "")));

      if (!orphans || orphans.length === 0) {
        return c.json({ success: true, count: 0 });
      }

      const ids = orphans.map((o) => o.id);
      await db.delete(furnitureItems).where(inArray(furnitureItems.id, ids));

      return c.json({ success: true, count: ids.length, ids });
    } catch (e: unknown) {
      return c.json({ success: false, error: (e as Error).message }, 500);
    }
});

storageMaintenance.post("/storage/clean", async (c) => {
    try {
      await requireRealUser(c);
      const s3Client = await getR2Client();
      const bucket = serverEnv.R2_BUCKET_NAME;
      if (!bucket) throw new Error("R2_BUCKET_NAME missing");

      const photos = await db.select({ imageUrl: furnitureItems.imageUrl }).from(furnitureItems);

      const dbFiles: Set<string> = new Set();
      photos.forEach((p) => {
        if (p.imageUrl?.includes("r2")) dbFiles.add(p.imageUrl.split("/").pop()!);
      });

      const r2FilesToClean: string[] = [];
      let continuationToken: string | undefined;
      do {
        const list = await s3Client.send(
          new ListObjectsV2Command({ Bucket: bucket, Prefix: "photox/public/", ContinuationToken: continuationToken }),
          { abortSignal: AbortSignal.timeout(6000) }
        );
        list.Contents?.forEach((c: { Key?: string }) => {
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

      if (!userId || userId === '00000000-0000-0000-0000-000000000000') {
        const existingItems = await db.query.furnitureItems.findMany({
            columns: { userId: true },
            where: sql`${furnitureItems.userId} IS NOT NULL AND ${furnitureItems.userId} != '00000000-0000-0000-0000-000000000000'`,
            limit: 5
        });
        
        if (existingItems && existingItems.length > 0) {
            userId = existingItems[0].userId || undefined;
        }
      }

      if (!userId) {
        userId = '00000000-0000-0000-0000-000000000000';
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
      const allPhotos = await db.select({ imageUrl: furnitureItems.imageUrl }).from(furnitureItems);
      allPhotos.forEach(p => {
        if (p.imageUrl) dbUrls.add(normalizeUrl(p.imageUrl));
      });

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
              id: crypto.randomUUID(),
              name: { zh: nameCandidate, en: nameCandidate, ms: nameCandidate },
              imageUrl: publicUrl,
              description: { zh: `[自动恢复] 源文件: ${filename}`, en: `[Auto-restore] Source: ${filename}`, ms: `[Pemulihan automatik] Sumber: ${filename}` },
              isHidden: false, 
              imageHash: hash,
              userId: userId
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
            
            MaintenanceJobSchema(jobData);
            jobStore.set(jobId, jobData);
          } catch (err) {
            logger.error(`Failed to process orphan ${key}:`, err);
          }
        }

        if (toCreate.length > 0) {
          await db.insert(furnitureItems).values(toCreate);
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
    } catch (e: unknown) {
      return c.json({ success: false, error: (e as Error).message }, 500);
    }
});

storageMaintenance.post("/storage/repair-hashes", async (c) => {
  try {
    await requireRealUser(c);
    const targets = await db.select({ id: furnitureItems.id, imageUrl: furnitureItems.imageUrl, imageHash: furnitureItems.imageHash })
      .from(furnitureItems)
      .where(sql`${or(isNull(furnitureItems.imageHash), eq(furnitureItems.imageHash, ""))} AND ${furnitureItems.imageUrl} IS NOT NULL`)
      .limit(20); 

    if (!targets || targets.length === 0) {
      return c.json({ success: true, count: 0, message: "没有发现需要修复哈希的记录" });
    }

    let repairedCount = 0;
    const crypto = await import('node:crypto');

    for (const target of targets) {
      try {
        if (!target.imageUrl) continue;

        const response = await fetch(target.imageUrl);
        if (!response.ok) continue;

        const buffer = await response.arrayBuffer();
        const hash = crypto.createHash('md5').update(Buffer.from(buffer)).digest('hex');

        await db.update(furnitureItems)
          .set({ imageHash: hash })
          .where(eq(furnitureItems.id, target.id));
        
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
  } catch (e: unknown) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});
