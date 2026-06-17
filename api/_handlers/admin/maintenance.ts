import { logger } from '../../_lib/logger.js';
import { Hono } from 'hono';
import { db, systemLogs, aiAuditLogs, maintenanceJobs } from "@/db/index";
import { eq, lt } from "drizzle-orm";

export const adminMaintenance = new Hono();

adminMaintenance.post("/daily-cleanup", async (c) => {
    try {
        // 1. Clean up old system logs (older than 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        await db.delete(systemLogs).where(lt(systemLogs.createdAt, thirtyDaysAgo));

        // 2. Clear old audit logs (older than 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        
        await db.delete(aiAuditLogs).where(lt(aiAuditLogs.createdAt, ninetyDaysAgo));

        return c.json({ 
            success: true, 
            message: 'Daily cleanup executed',
            timestamp: new Date().toISOString()
        });
    } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        logger.error('[Maintenance] Cleanup failed', err);
        return c.json({ success: false, error: err.message }, 500);
    }
});

adminMaintenance.get("/jobs", async (c) => {
    try {
        const data = await db.select().from(maintenanceJobs);
        return c.json({ success: true, data });
    } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        return c.json({ success: false, error: err.message }, 500);
    }
});

adminMaintenance.get("/job/:jobId", async (c) => {
    try {
        const { jobId } = c.req.param();
        const data = await db.query.maintenanceJobs.findFirst({
            where: eq(maintenanceJobs.id, jobId)
        });
        return c.json({ success: true, data });
    } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        return c.json({ success: false, error: err.message }, 500);
    }
});

adminMaintenance.post("/member-count-mismatch/preview", async (c) => {
    return c.json({ success: true, preview: [] });
});

adminMaintenance.post("/missing-hash/preview", async (c) => {
    return c.json({ success: true, preview: [] });
});
