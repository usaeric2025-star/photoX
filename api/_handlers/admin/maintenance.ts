import { logger } from '../../_lib/logger.js';
import { Hono } from 'hono';
import { db, systemLogs, aiAuditLogs, maintenanceJobs, furnitureItems } from '../../_lib/db/index.js';
import { eq, lt, or, isNull, inArray, sql } from "drizzle-orm";
import { runStorageAudit } from "../../_lib/maintenance/storageUtils.js";
import { requireRealUser } from "../../_lib/auth.js";
import { getR2Client } from "../../_lib/storage.js";
import { getServerEnv } from "../../../shared/envSchema.js";
import { ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { refreshPhotosView } from '../../_lib/db/actions.js';

const serverEnv = getServerEnv(process.env);
export const adminMaintenance = new Hono();

// --- 0. View Refresh (CQRS) ---
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
        }

        return c.json({ success: true, count: idsToRemove.length });
    } catch (e: unknown) {
        logger.error("Deduplication failed:", e);
        return c.json({ success: false, error: String(e) }, 500);
    }
});

// --- 3. Error Event Management ---
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
