import { db, tags as tagsTable, photoTags } from '../index.js';
import { eq, ilike, asc, inArray, sql, and } from 'drizzle-orm';

export async function getAllTags() {
    return await db.select().from(tagsTable).orderBy(asc(tagsTable.name));
}

export async function searchTags(keyword: string, limit: number = 100) {
    const query = db.select().from(tagsTable).orderBy(asc(tagsTable.name));
    if (keyword) {
        query.where(ilike(tagsTable.name, `%${keyword}%`));
    }
    return await query.limit(limit);
}

export async function createTag(data: typeof tagsTable.$inferInsert) {
    const [result] = await db.insert(tagsTable).values(data).returning();
    return result;
}

export async function batchCreateTags(data: (typeof tagsTable.$inferInsert)[]) {
    return await db.insert(tagsTable).values(data).returning({ id: tagsTable.id, name: tagsTable.name });
}

export async function updateTag(id: number, updates: Partial<typeof tagsTable.$inferInsert>) {
    return await db.update(tagsTable).set(updates).where(eq(tagsTable.id, id));
}

export async function deleteTag(id: number) {
    return await db.delete(tagsTable).where(eq(tagsTable.id, id));
}

export async function refreshTagHotScores() {
    return await db.execute(sql`SELECT refresh_tag_hot_scores()`);
}

export async function removeTagFromPhoto(photoId: string, tagId: number) {
    return await db.delete(photoTags).where(and(eq(photoTags.photoId, photoId), eq(photoTags.tagId, tagId)));
}

export async function getTagDetails(tagIds: number[]) {
    return await db.select({ id: tagsTable.id, isPinned: tagsTable.isPinned }).from(tagsTable).where(inArray(tagsTable.id, tagIds));
}

export async function getCurrentPhotoTags(photoId: string) {
    return await db.select({ tagId: photoTags.tagId }).from(photoTags).where(eq(photoTags.photoId, photoId));
}

export async function syncPhotoTags(photoId: string, tagIds: number[]) {
    await db.delete(photoTags).where(eq(photoTags.photoId, photoId));
    if (tagIds.length > 0) {
        await db.insert(photoTags).values(tagIds.map(tagId => ({ photoId, tagId })));
    }
}

export async function syncBatchPhotoTags(photoIds: string[], tagIds: number[]) {
    await db.delete(photoTags).where(inArray(photoTags.photoId, photoIds));
    if (tagIds.length > 0) {
        const associations = photoIds.flatMap(photoId => tagIds.map(tagId => ({ photoId, tagId })));
        await db.insert(photoTags).values(associations);
    }
}
