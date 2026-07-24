
import { db, groups as groupsTable, furnitureItems } from '../index.js';
import { eq, and, or, inArray, isNull, sql, asc } from 'drizzle-orm';
import { logger } from '../../logger.js';

export interface GroupListParams {
    isAdminMode?: boolean;
}

export async function getAllGroups(params: GroupListParams = {}) {
    const { isAdminMode = false } = params;
    let query = db.select().from(groupsTable).orderBy(asc(groupsTable.name));

    if (!isAdminMode) {
        return await db.select().from(groupsTable)
            .where(eq(groupsTable.status, 'active'))
            .orderBy(asc(groupsTable.name));
    }

    return await query;
}

export async function getGroupById(id: string) {
    return await db.query.groups.findFirst({
        where: eq(groupsTable.id, id)
    });
}

export async function createGroup(data: typeof groupsTable.$inferInsert) {
    const [result] = await db.insert(groupsTable).values(data).returning();
    return result;
}

export async function updateGroup(id: string, updates: Partial<typeof groupsTable.$inferInsert>) {
    return await db.update(groupsTable)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(groupsTable.id, id))
        .returning();
}

export async function upsertGroup(cleanMapped: Partial<typeof groupsTable.$inferInsert> & { id: string }) {
    const { id, ...updatePayloadData } = cleanMapped;

    const insertPayload = {
        ...cleanMapped,
        createdAt: new Date(),
        updatedAt: new Date()
    } as typeof groupsTable.$inferInsert;

    const updatePayload = {
        ...updatePayloadData,
        updatedAt: new Date()
    };

    const [data] = await db.insert(groupsTable)
        .values(insertPayload)
        .onConflictDoUpdate({
            target: groupsTable.id,
            set: updatePayload
        })
        .returning();
    
    return data;
}

export async function deleteGroup(id: string) {
    return await db.delete(groupsTable).where(eq(groupsTable.id, id));
}

export async function getPhotosSummary(photoIds: string[]) {
    return await db.select({
        id: furnitureItems.id,
        groupId: furnitureItems.groupId,
        userId: furnitureItems.userId,
        isGroupCover: furnitureItems.isGroupCover
    })
    .from(furnitureItems)
    .where(inArray(furnitureItems.id, photoIds));
}

export async function updatePhotosGroup(photoIds: string[], targetGroupId: string | null) {
    return await db.update(furnitureItems)
        .set({ groupId: targetGroupId, isGroupCover: false })
        .where(inArray(furnitureItems.id, photoIds));
}

export async function updateGroupPhotosGroup(sourceGroupIds: string[], targetGroupId: string | null) {
    return await db.update(furnitureItems)
        .set({ groupId: targetGroupId, isGroupCover: false })
        .where(inArray(furnitureItems.groupId, sourceGroupIds));
}

export async function callMergeGroups(sourceGroupIds: string[], targetGroupId: string) {
    return await db.execute(sql`SELECT merge_groups(ARRAY[${sql.join(sourceGroupIds.map(id => sql`${id}::uuid`), sql`, `)}]::uuid[], ${targetGroupId}::uuid)`);
}

export async function callDissolveGroup(groupId: string) {
    return await db.execute(sql`SELECT dissolve_group(${groupId}::uuid)`);
}

export async function callMovePhotosToGroup(photoIds: string[], targetGroupId: string | null) {
    return await db.execute(sql`SELECT move_photos_to_group(ARRAY[${sql.join(photoIds.map(id => sql`${id}::uuid`), sql`, `)}]::uuid[], ${targetGroupId}::uuid)`);
}

export async function removePhotosFromGroup(photoIds: string[], groupId: string) {
    return await db.update(furnitureItems)
        .set({ groupId: null, isGroupCover: false })
        .where(and(
            eq(furnitureItems.groupId, groupId),
            inArray(furnitureItems.id, photoIds)
        ));
}

export async function resetGroupCovers(groupId: string) {
    return await db.update(furnitureItems)
        .set({ isGroupCover: false })
        .where(eq(furnitureItems.groupId, groupId));
}

export async function setPhotoAsCover(photoId: string) {
    return await db.update(furnitureItems)
        .set({ isGroupCover: true })
        .where(eq(furnitureItems.id, photoId));
}

export async function getGroupStats() {
    return await db.select({
        id: groupsTable.id,
        photoCount: sql<number>`cast(count(${furnitureItems.id}) as int)`
    })
    .from(groupsTable)
    .leftJoin(furnitureItems, eq(groupsTable.id, furnitureItems.groupId))
    .groupBy(groupsTable.id);
}

export async function repairGroupStatuses() {
    return await db.update(groupsTable)
        .set({ status: 'active' })
        .where(or(eq(groupsTable.status, 'confirmed'), eq(groupsTable.status, 'draft')));
}

export async function dissolveAndCleanupGroups(photoIdsToDissolve: string[], groupId: string) {
    if (photoIdsToDissolve.length > 0) {
        await db.update(furnitureItems)
            .set({ groupId: null, isGroupCover: false, isPinned: false })
            .where(inArray(furnitureItems.id, photoIdsToDissolve));
    }
    return await db.delete(groupsTable).where(eq(groupsTable.id, groupId));
}
