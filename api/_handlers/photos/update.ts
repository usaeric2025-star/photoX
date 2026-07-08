import { Hono } from 'hono';
import * as v from 'valibot';
import { db, furnitureItems, groups as groupsTable, categories, manufacturers, photoTags } from '../../_lib/db/index.js';
import { eq, inArray, and } from 'drizzle-orm';
import { syncGroupCoversAndCount } from '../../_lib/groups.js';
import { refreshPhotosView } from '../../_lib/db/actions.js';
import { errorResponse, successResponse } from '../../_lib/response.js';
import { PhotoBatchUpdateReqSchema, PhotoUpdateReqSchema } from '../../../shared/apiContractSchema.js';
import { sanitizePhotoPayload } from './sanitize.js';

export const updateRoutes = new Hono()
  .post('/batch', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(PhotoBatchUpdateReqSchema, body);
    if (!check.success) throw new Error(check.issues[0].message);
    
    const { ids, updates } = check.output;
    try {
        // ✅ 強制攔截 base64
        if (updates.imageUrl && (updates.imageUrl as string).startsWith('data:image/')) {
            throw new Error('image_url 不接受 base64，請先上傳檔案');
        }

        // ✅ 強制限制標題長度
        if (updates.name) {
            let nameStr = '';
            if (typeof updates.name === 'string') {
                nameStr = updates.name;
            } else if (updates.name && typeof updates.name === 'object') {
                const obj = updates.name as Record<string, unknown>;
                nameStr = String(obj.zh || obj.en || obj.ms || "");
            }

            if (nameStr.length > 200) throw new Error('標題超過 200 字上限');
            updates.name = nameStr;
        }

        const mappedUpdates = sanitizePhotoPayload(updates);

        if (mappedUpdates.groupId) {
            const groupRows = await db.select({ id: groupsTable.id }).from(groupsTable).where(eq(groupsTable.id, mappedUpdates.groupId as string)).limit(1);
            if (groupRows.length === 0) {
                mappedUpdates.groupId = null;
            }
        }
        if (mappedUpdates.categoryId) {
            const catRows = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, mappedUpdates.categoryId as number)).limit(1);
            if (catRows.length === 0) mappedUpdates.categoryId = null;
        }
        if (mappedUpdates.manufacturerId) {
            const manRows = await db.select({ id: manufacturers.id }).from(manufacturers).where(eq(manufacturers.id, mappedUpdates.manufacturerId as string)).limit(1);
            if (manRows.length === 0) mappedUpdates.manufacturerId = null;
        }

        // Handle tags bulk update if present
        if (updates.tags && Array.isArray(updates.tags)) {
            const tagIds = updates.tags.map(String).map(Number).filter(n => !isNaN(n));
            
            await db.transaction(async (tx) => {
                // Delete old tags for these photos
                await tx.delete(photoTags).where(inArray(photoTags.photoId, ids));
                
                // Insert new tags
                if (tagIds.length > 0) {
                    const tagInsertValues = [];
                    for (const pid of ids) {
                        for (const tid of tagIds) {
                            tagInsertValues.push({ photoId: pid, tagId: tid });
                        }
                    }
                    if (tagInsertValues.length > 0) {
                        await tx.insert(photoTags).values(tagInsertValues);
                    }
                }
                
                if (Object.keys(mappedUpdates).length > 0) {
                    await tx.update(furnitureItems)
                        .set(mappedUpdates)
                        .where(inArray(furnitureItems.id, ids));
                }
            });
        } else if (Object.keys(mappedUpdates).length > 0) {
            await db.update(furnitureItems)
                .set(mappedUpdates)
                .where(inArray(furnitureItems.id, ids));
        }

        const data = ids.map(id => ({ id }));

        await refreshPhotosView();

        return successResponse(c, data.map(d => d.id));
    } catch (error: unknown) {
        const { errorFactory } = await import('../../_lib/error/factory.js');
        throw errorFactory.wrap(error, 'api./api/photos/update-batch', 'DB_ERROR');
    }
  })
  .post('/update', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(PhotoUpdateReqSchema, body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { id, updates } = check.output;
    try {
        // Fetch snapshot before update
        const beforeUpdate = await db.query.furnitureItems.findFirst({
            columns: { groupId: true },
            where: eq(furnitureItems.id, id)
        });

        // ✅ 強制攔截 base64
        if (updates.imageUrl && (updates.imageUrl as string).startsWith('data:image/')) {
            throw new Error('image_url 不接受 base64，請先上傳檔案');
        }

        // ✅ 強制限制標題長度
        if (updates.name) {
            let nameStr = '';
            if (typeof updates.name === 'string') {
                nameStr = updates.name;
            } else if (updates.name && typeof updates.name === 'object') {
                const obj = updates.name as Record<string, unknown>;
                nameStr = String(obj.zh || obj.en || obj.ms || "");
            }

            if (nameStr.length > 200) throw new Error('標題超過 200 字上限');
            updates.name = nameStr;
        }

        const mappedUpdates = sanitizePhotoPayload(updates);
        mappedUpdates.updatedAt = new Date();

        if (mappedUpdates.groupId) {
            const groupRows = await db.select({ id: groupsTable.id }).from(groupsTable).where(eq(groupsTable.id, mappedUpdates.groupId as string)).limit(1);
            if (groupRows.length === 0) {
                mappedUpdates.groupId = null;
            }
        }
        if (mappedUpdates.categoryId) {
            const catRows = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, mappedUpdates.categoryId as number)).limit(1);
            if (catRows.length === 0) mappedUpdates.categoryId = null;
        }
        if (mappedUpdates.manufacturerId) {
            const manRows = await db.select({ id: manufacturers.id }).from(manufacturers).where(eq(manufacturers.id, mappedUpdates.manufacturerId as string)).limit(1);
            if (manRows.length === 0) mappedUpdates.manufacturerId = null;
        }

        // Remove unupdatable keys if they were accidentally passed
        delete mappedUpdates.id;
        delete mappedUpdates.createdAt;

        // Special handling for group cover
        if (updates.isGroupCover === true) {
            const current = await db.query.furnitureItems.findFirst({
                columns: { groupId: true },
                where: eq(furnitureItems.id, id)
            });
            if (current?.groupId) {
                await db.update(furnitureItems)
                    .set({ isGroupCover: false })
                    .where(eq(furnitureItems.groupId, (current?.groupId || '') as string));
                
                await db.update(groupsTable)
                    .set({ coverPhotoId: id })
                    .where(eq(groupsTable.id, current.groupId));
            }
        }

        if (Object.keys(mappedUpdates).length === 0 && (!updates.tags || !Array.isArray(updates.tags))) {
            const currentData = await db.query.furnitureItems.findFirst({
                where: eq(furnitureItems.id, id)
            });
            return successResponse(c, currentData);
        }

        let results;
        if (updates.tags && Array.isArray(updates.tags)) {
            const tagIds = updates.tags.map(String).map(Number).filter(n => !isNaN(n));
            
            await db.transaction(async (tx) => {
                // Delete old tags for this photo
                await tx.delete(photoTags).where(eq(photoTags.photoId, id));
                
                // Insert new tags
                if (tagIds.length > 0) {
                    const tagInsertValues = tagIds.map(tid => ({
                        photoId: id,
                        tagId: tid
                    }));
                    await tx.insert(photoTags).values(tagInsertValues);
                }
                
                if (Object.keys(mappedUpdates).length > 0) {
                    results = await tx.update(furnitureItems)
                        .set(mappedUpdates)
                        .where(eq(furnitureItems.id, id))
                        .returning();
                } else {
                    results = await tx.select().from(furnitureItems).where(eq(furnitureItems.id, id)).limit(1);
                }
            });
        } else {
            results = await db.update(furnitureItems).set(mappedUpdates).where(eq(furnitureItems.id, id)).returning();
        }
        const data = results[0] || null;

        // POST-MUTATION: Reconcile covers & counts
        const affectedGroupIds: string[] = [];
        if (beforeUpdate?.groupId) affectedGroupIds.push(beforeUpdate.groupId);
        if (mappedUpdates.groupId) affectedGroupIds.push(String(mappedUpdates.groupId));

        if (affectedGroupIds.length > 0) {
            await syncGroupCoversAndCount(affectedGroupIds);
        }

        await refreshPhotosView();

        return successResponse(c, data);
    } catch (error: unknown) {
        const { errorFactory } = await import('../../_lib/error/factory.js');
        throw errorFactory.wrap(error, 'api./api/photos/update', 'DB_ERROR');
    }
  });
