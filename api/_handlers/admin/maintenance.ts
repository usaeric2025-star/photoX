import { logger, measurePerformance } from '../../_lib/logger.js';
import { Hono } from 'hono';
import * as v from 'valibot';
import { 
    getMaintenanceJobs, 
    cleanOldLogs, 
    getSystemLogs, 
    clearAllSystemLogs, 
    getPhotosForDeduplication,
    deletePhotosByIds
} from '../../_lib/db/queries/maintenance.js';
import { getGlobalStats } from '../../_lib/db/queries/stats.js';
import { runStorageAudit } from '../../_lib/maintenance/storageUtils.js';
import { requireRealUser } from '../../_lib/auth.js';
import { getR2Client } from '../../_lib/storage.js';
import { getServerEnv } from "../../../shared/envSchema.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { refreshPhotosView } from '../../_lib/db/actions.js';
import { normalizeUrl } from '../../_lib/maintenance/storageUtils.js';
import { streamSSE } from 'hono/streaming';
import { Buffer } from 'buffer';

import { successResponse } from '../../_lib/response.js';
import { errorFactory } from '../../_lib/error/factory.js';

const serverEnv = getServerEnv(process.env);
export const adminMaintenance = new Hono()
// --- 0. View Refresh (CQRS) ---
.get("/jobs", async (c) => {
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const data = await getMaintenanceJobs(limit);
    return successResponse(c, data);
})
.post("/refresh-view", async (c) => {
    await requireRealUser(c);
    await refreshPhotosView();
    return successResponse(c, null, { message: 'Materialized view v_photos_list refreshed' });
})
// --- 1. Basic Cleanup ---
.post("/daily-cleanup", async (c) => {
    await measurePerformance('daily-cleanup', async () => {
        await cleanOldLogs(30);
    });
    return successResponse(c, null, { message: 'Daily cleanup executed' });
})
.get("/stats", async (c) => {
    const data = await measurePerformance('get-stats', () => getGlobalStats());
    return successResponse(c, data);
})
// --- 2. Storage Audit & Repair ---
.get("/storage/audit", async (c) => {
    const audit = await runStorageAudit();
    return successResponse(c, { 
        healthyCount: audit.healthy.length,
        ghosts: { count: audit.ghosts.length, samples: audit.ghosts.slice(0, 10) },
        orphans: { count: audit.orphans.length, samples: audit.orphans.slice(0, 10) },
        truncated: audit.truncated || false
    });
})
.get("/storage/audit-stream", async (c) => {
    await requireRealUser(c);
    return streamSSE(c, async (stream) => {
        try {
            const audit = await runStorageAudit(async (progress, message) => {
                await stream.writeSSE({
                    data: JSON.stringify({ progress, message })
                });
            });
            
            await stream.writeSSE({
                data: JSON.stringify({ 
                    success: true, 
                    progress: 1,
                    message: '完成',
                    data: { 
                        healthyCount: audit.healthy.length,
                        ghosts: { count: audit.ghosts.length, samples: audit.ghosts.slice(0, 10) },
                        orphans: { count: audit.orphans.length, samples: audit.orphans.slice(0, 10) },
                        truncated: audit.truncated || false
                    } 
                })
            });
        } catch (err) {
            logger.error("Audit stream failed:", err);
            const appErr = errorFactory.wrap(err, 'admin.maintenance.storage-audit-stream', 'INTERNAL_ERROR');
            await stream.writeSSE({
                data: JSON.stringify(errorFactory.fail(appErr))
            });
        }
    });
})
.post("/storage/recover-orphans", async (c) => {
    await requireRealUser(c);
    const body = await c.req.json();
    const check = v.safeParse(v.object({ keys: v.array(v.string()) }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { keys } = check.output;

    const targetKeys = keys.slice(0, 50); 
    const s3Client = await getR2Client();
    const bucketName = serverEnv.R2_BUCKET_NAME!;
    const publicUrlPrefix = (serverEnv.R2_PUBLIC_URL_PREFIX || "").replace(/\/$/, '');
    const isPrefixSsl = publicUrlPrefix.startsWith('http');
    
    return streamSSE(c, async (stream) => {
        try {
            const crypto = await import('node:crypto');
            const results = [];
            
            // We need query layer for furnitureItems as well
            const { getPhotosList } = await import('../../_lib/db/queries/photos.js');
            const { items: existingPhotos } = await getPhotosList({ limit: 5000, isAdminMode: true });
            const existingUrlsSet = new Set(existingPhotos.map(p => normalizeUrl(p.imageUrl || "")));
    
            let i = 0;
            for (const key of targetKeys) {
                i++;
                await stream.writeSSE({
                    data: JSON.stringify({ progress: i / targetKeys.length, message: `Processing ${key.split('/').pop()}` })
                });
                
                try {
                    const publicUrl = isPrefixSsl ? `${publicUrlPrefix}/${key}` : `https://${publicUrlPrefix}/${key}`;
                    const normalized = normalizeUrl(publicUrl);
                    if (existingUrlsSet.has(normalized)) {
                        results.push({ key, status: 'skipped', reason: 'exists' });
                        continue;
                    }
    
                    const response = await s3Client.send(new GetObjectCommand({
                        Bucket: bucketName,
                        Key: key
                    }));
                    if (!response.Body) {
                        results.push({ key, status: 'failed', reason: 'empty_body' });
                        continue;
                    }
    
                    const buffer = Buffer.from(await response.Body.transformToByteArray());
                    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    
                    const photoId = crypto.randomUUID();
                    // Just direct insert here for complexity, or move to photos query
                    const { db, furnitureItems } = await import('../../_lib/db/index.js');
                    await db.insert(furnitureItems).values({
                        id: photoId,
                        userId: '8ec53131-a589-4b50-beb4-6b5308541e1b',
                        imageUrl: publicUrl,
                        imageHash: hash,
                        name: "Recovered Photo",
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
    
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
    
            await stream.writeSSE({
                data: JSON.stringify({ success: true, progress: 1, message: 'Done', results })
            });
        } catch (err) {
            logger.error("Recovery stream failed:", err);
            const appErr = errorFactory.wrap(err, 'admin.maintenance.storage-recover-stream', 'INTERNAL_ERROR');
            await stream.writeSSE({
                data: JSON.stringify(errorFactory.fail(appErr))
            });
        }
    });
})
.post("/storage/deduplicate", async (c) => {
    await requireRealUser(c);
    const records = await getPhotosForDeduplication();

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
        await deletePhotosByIds(idsToRemove);
        await refreshPhotosView();
    }

    return successResponse(c, { count: idsToRemove.length });
})
.post("/storage/clean-ghosts", async (c) => {
    await requireRealUser(c);
    const audit = await runStorageAudit();
    const ghostIds = audit.ghosts.map(g => g.id);
    
    if (ghostIds.length > 0) {
        await deletePhotosByIds(ghostIds);
        await refreshPhotosView();
    }

    return successResponse(c, { count: ghostIds.length });
})
// --- 3. Error Event Management ---
.post("/repair", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ issueId: v.string() }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { issueId } = check.output;

    logger.info(`[Repair] Requested repair for issue: ${issueId}`);
    return successResponse(c, null, { message: `Repair initiated for ${issueId}` });
})
.get("/error-events", async (c) => {
    const limit = parseInt(c.req.query('limit') || '100', 10);
    const data = await getSystemLogs(limit);
    return successResponse(c, data);
})
.post("/error-events-clear", async (c) => {
    await clearAllSystemLogs();
    return successResponse(c, null);
});
