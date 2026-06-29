import { logger } from '../../_lib/logger.js';
import { Hono } from 'hono';
import { db, systemLogs, aiAuditLogs, maintenanceJobs, furnitureItems, groups as groupsTable, tags as tagsTable, categories } from '../../_lib/db/index.js';
import { eq, lt, or, isNull, inArray, sql, count } from "drizzle-orm";
import { runStorageAudit } from '../../_lib/maintenance/storageUtils.js';
import { requireRealUser } from '../../_lib/auth.js';
import { getR2Client } from '../../_lib/storage.js';
import { getServerEnv } from "../../../shared/envSchema.js";
import { ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { refreshPhotosView } from '../../_lib/db/actions.js';
import { normalizeUrl } from '../../_lib/maintenance/storageUtils.js';

const serverEnv = getServerEnv(process.env);
export const adminMaintenance = new Hono();

// --- 0. View Refresh (CQRS) ---
adminMaintenance.get("/jobs", async (c) => {
    try {
        const { desc } = await import('drizzle-orm');
        const data = await db.query.maintenanceJobs.findMany({
            orderBy: [desc(maintenanceJobs.createdAt)],
            limit: 50
        });
        return c.json({ success: true, data });
    } catch (e: unknown) {
        return c.json({ success: false, error: String(e) }, 500);
    }
});

adminMaintenance.post("/refresh-view", async (c) => {
    try {
        await requireRealUser(c);
        await refreshPhotosView();
        return c.json({ success: true, message: 'Materialized view v_photos_list refreshed' });
    } catch (e: unknown) {
        logger.error('[Maintenance] View refresh failed', e);
        return c.json({ success: false, error: String(e) }, 500);
    }
});

// --- 1. Basic Cleanup ---
adminMaintenance.post("/daily-cleanup", async (c) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        await db.delete(systemLogs).where(lt(systemLogs.createdAt, thirtyDaysAgo));

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        await db.delete(aiAuditLogs).where(lt(aiAuditLogs.createdAt, ninetyDaysAgo));

        return c.json({ success: true, message: 'Daily cleanup executed' });
    } catch (e: unknown) {
        logger.error('[Maintenance] Cleanup failed', e);
        return c.json({ success: false, error: String(e) }, 500);
    }
});

adminMaintenance.get("/stats", async (c) => {
    try {
        const [photoCount] = await db.select({ count: count() }).from(furnitureItems);
        const [hiddenCount] = await db.select({ count: count() }).from(furnitureItems).where(eq(furnitureItems.isHidden, true));
        const [groupCount] = await db.select({ count: count() }).from(groupsTable);
        const [tagCount] = await db.select({ count: count() }).from(tagsTable);
        const [categoryCount] = await db.select({ count: count() }).from(categories);

        return c.json({
            success: true,
            data: {
                totalPhotos: Number(photoCount.count),
                hiddenPhotos: Number(hiddenCount.count),
                totalGroups: Number(groupCount.count),
                totalTags: Number(tagCount.count),
                totalCategories: Number(categoryCount.count)
            }
        });
    } catch (e: unknown) {
        logger.error('[Maintenance] Stats failed', e);
        return c.json({ success: false, error: String(e) }, 500);
    }
});

// --- 2. Storage Audit & Repair ---
adminMaintenance.get("/storage/audit", async (c) => {
    try {
        const audit = await runStorageAudit();
        return c.json({ 
            success: true, 
            data: { 
                healthyCount: audit.healthy.length,
                ghosts: { count: audit.ghosts.length, samples: audit.ghosts.slice(0, 10) },
                orphans: { count: audit.orphans.length, samples: audit.orphans.slice(0, 10) },
                truncated: audit.truncated || false
            } 
        });
    } catch (e: unknown) {
        logger.error("Audit failed:", e);
        return c.json({ success: false, error: String(e) }, 500);
    }
});

adminMaintenance.post("/storage/recover-orphans", async (c) => {
    try {
        await requireRealUser(c);
        const { keys } = await c.req.json();
        if (!keys || !Array.isArray(keys)) {
            return c.json({ success: false, error: "keys array required" }, 400);
        }

        const targetKeys = keys.slice(0, 50); // Limit to 50
        const s3Client = await getR2Client();
        const bucketName = serverEnv.R2_BUCKET_NAME!;
        const publicUrlPrefix = (serverEnv.R2_PUBLIC_URL_PREFIX || "").replace(/\/$/, '');
        const isPrefixSsl = publicUrlPrefix.startsWith('http');

        const crypto = await import('node:crypto');
        const results = [];

        // Pre-fetch existing URLs to avoid duplicates within this batch
        const existingPhotos = await db.select({ imageUrl: furnitureItems.imageUrl }).from(furnitureItems);
        const existingUrlsSet = new Set(existingPhotos.map(p => normalizeUrl(p.imageUrl || "")));

        for (const key of targetKeys) {
            try {
                // 1. Construct public URL and Normalize
                const publicUrl = isPrefixSsl 
                    ? `${publicUrlPrefix}/${key}`
                    : `https://${publicUrlPrefix}/${key}`;
                
                const normalized = normalizeUrl(publicUrl);
                if (existingUrlsSet.has(normalized)) {
                    results.push({ key, status: 'skipped', reason: 'exists' });
                    continue;
                }

                // 2. Fetch from R2
                const getCommand = new GetObjectCommand({
                    Bucket: bucketName,
                    Key: key
                });
                const response = await s3Client.send(getCommand);
                if (!response.Body) {
                    results.push({ key, status: 'failed', reason: 'empty_body' });
                    continue;
                }

                const buffer = Buffer.from(await response.Body.transformToByteArray());
                const hash = crypto.createHash('md5').update(buffer).digest('hex');

                // 3. Create DB record
                const photoId = crypto.randomUUID();
                await db.insert(furnitureItems).values({
                    id: photoId,
                    userId: '8ec53131-a589-4b50-beb4-6b5308541e1b', // Default admin/staff user ID
                    imageUrl: publicUrl,
                    imageHash: hash,
                    name: { zh: `找回的照片 (${key.split('/').pop()})` },
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any);

                existingUrlsSet.add(normalized);
                results.push({ key, status: 'recovered', id: photoId });
            } catch (err) {
                logger.error(`Failed to recover ${key}:`, err);
                results.push({ key, status: 'failed', error: String(err) });
            }
        }

        if (results.some(r => r.status === 'recovered')) {
            await refreshPhotosView();
        }

        return c.json({ success: true, results });
    } catch (e: unknown) {
        logger.error("Recovery failed:", e);
        return c.json({ success: false, error: String(e) }, 500);
    }
});

adminMaintenance.post("/storage/deduplicate", async (c) => {
    try {
        await requireRealUser(c);
        const records = await db.select({
            id: furnitureItems.id,
            imageHash: furnitureItems.imageHash,
            userId: furnitureItems.userId,
            createdAt: furnitureItems.createdAt
        }).from(furnitureItems)
        .where(sql`${furnitureItems.imageHash} IS NOT NULL AND ${furnitureItems.imageHash} != ''`);

        const groups: Record<string, typeof records> = {};
        records.forEach(r => {
            const key = `${r.userId}_${r.imageHash}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        });

        const idsToRemove: string[] = [];
        for (const key in groups) {
            const group = groups[key];
            if (group.length > 1) {
                group.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
                const [_, ...duplicates] = group;
                duplicates.forEach(d => idsToRemove.push(d.id));
            }
        }

        if (idsToRemove.length > 0) {
            await db.delete(furnitureItems).where(inArray(furnitureItems.id, idsToRemove));
            await refreshPhotosView();
        }

        return c.json({ success: true, count: idsToRemove.length });
    } catch (e: unknown) {
        logger.error("Deduplication failed:", e);
        return c.json({ success: false, error: String(e) }, 500);
    }
});

adminMaintenance.post("/storage/clean-ghosts", async (c) => {
    try {
        await requireRealUser(c);
        const audit = await runStorageAudit();
        const ghostIds = audit.ghosts.map(g => g.id);
        
        if (ghostIds.length > 0) {
            await db.delete(furnitureItems).where(inArray(furnitureItems.id, ghostIds));
            await refreshPhotosView();
        }

        return c.json({ success: true, count: ghostIds.length });
    } catch (e: unknown) {
        logger.error("Ghost cleanup failed:", e);
        return c.json({ success: false, error: String(e) }, 500);
    }
});

// --- 3. Error Event Management ---
adminMaintenance.post("/repair", async (c) => {
    try {
        const { issueId } = await c.req.json();
        logger.info(`[Repair] Requested repair for issue: ${issueId}`);
        // Handle specific issue repairs here if needed
        return c.json({ success: true, message: `Repair initiated for ${issueId}` });
    } catch (e: unknown) {
        return c.json({ success: false, error: String(e) }, 500);
    }
});

adminMaintenance.get("/db-debug", async (c) => {
    try {
        const res = await db.execute(sql`SHOW statement_timeout`);
        return c.json({ success: true, data: res });
    } catch (e: unknown) {
        return c.json({ success: false, error: String(e) }, 500);
    }
});

adminMaintenance.get("/error-events", async (c) => {
    try {
        const limit = parseInt(c.req.query('limit') || '100', 10);
        const { desc } = await import('drizzle-orm');
        const data = await db.query.systemLogs.findMany({
            orderBy: [desc(systemLogs.createdAt)],
            limit: limit
        });
        return c.json({ success: true, data });
    } catch (e: unknown) {
        return c.json({ success: false, error: String(e) }, 500);
    }
});

adminMaintenance.post("/error-events-clear", async (c) => {
    try {
        await db.delete(systemLogs);
        return c.json({ success: true });
    } catch (e: unknown) {
        return c.json({ success: false, error: String(e) }, 500);
    }
});
