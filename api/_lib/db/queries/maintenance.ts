
import { db, systemLogs, aiAuditLogs, maintenanceJobs, furnitureItems, groups as groupsTable, tags as tagsTable, categories } from '../index.js';
import { eq, lt, desc, count, sql, inArray } from 'drizzle-orm';

export async function getMaintenanceJobs(limit: number = 50) {
    return await db.query.maintenanceJobs.findMany({
        orderBy: [desc(maintenanceJobs.createdAt)],
        limit
    });
}

export async function cleanOldLogs(days: number = 30) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);
    
    return await Promise.all([
        db.delete(systemLogs).where(lt(systemLogs.createdAt, thirtyDaysAgo)),
        db.delete(aiAuditLogs).where(lt(aiAuditLogs.createdAt, thirtyDaysAgo)) // For audit logs, maybe keep same as system
    ]);
}

export async function getSystemLogs(limit: number = 100) {
    return await db.query.systemLogs.findMany({
        orderBy: [desc(systemLogs.createdAt)],
        limit
    });
}

export async function clearAllSystemLogs() {
    return await db.delete(systemLogs);
}

export async function deletePhotosByIds(ids: string[]) {
    if (ids.length === 0) return;
    return await db.delete(furnitureItems).where(inArray(furnitureItems.id, ids));
}

export async function getPhotosForDeduplication() {
    return await db.select({
        id: furnitureItems.id,
        imageHash: furnitureItems.imageHash,
        userId: furnitureItems.userId,
        createdAt: furnitureItems.createdAt
    }).from(furnitureItems)
    .where(sql`${furnitureItems.imageHash} IS NOT NULL AND ${furnitureItems.imageHash} != ''`);
}
