import { Hono } from 'hono';
import * as v from 'valibot';
import { db, furnitureItems, groups as groupsTable, categories, manufacturers, photoTags } from '../../_lib/db/index.js';
import { eq, inArray, and } from 'drizzle-orm';
import { syncGroupCoversAndCount } from '../../_lib/groups.js';
import { refreshPhotosView } from '../../_lib/db/actions.js';
import { errorResponse, successResponse } from '../../_lib/response.js';
import { PhotoBatchUpdateReqSchema, PhotoUpdateReqSchema } from '../../../shared/apiContractSchema.js';
import { sanitizePhotoPayload } from './sanitize.js';
import { errorFactory } from '../../_lib/error/factory.js';

export const updateRoutes = new Hono()
  .post('/batch', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(PhotoBatchUpdateReqSchema, body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { ids, updates } = check.output;
    try {
        const mappedUpdates = sanitizePhotoPayload(updates as Record<string, unknown>);

        // ✅ Additional DB-level checks (optional but safer)
        if (mappedUpdates.groupId) {
            const groupRows = await db.select({ id: groupsTable.id }).from(groupsTable).where(eq(groupsTable.id, mappedUpdates.groupId as string)).limit(1);
            if (groupRows.length === 0) mappedUpdates.groupId = null;
        }
        if (mappedUpdates.categoryId) {
            const catRows = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, mappedUpdates.categoryId as number)).limit(1);
            if (catRows.length === 0) mappedUpdates.categoryId = null;
        }

        // Handle tags bulk update
        if (updates.tags && Array.isArray(updates.tags)) {
            const tagIds = updates.tags.map(Number).filter(n => !isNaN(n));
            
            await db.transaction(async (tx) => {
                await tx.delete(photoTags).where(inArray(photoTags.photoId, ids));
                
                if (tagIds.length > 0) {
                    const tagInsertValues = ids.flatMap(pid => 
                        tagIds.map(tid => ({ photoId: pid, tagId: tid }))
                    );
                    await tx.insert(photoTags).values(tagInsertValues);
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

        await refreshPhotosView();
        return successResponse(c, ids);
    } catch (error: unknown) {
        throw errorFactory.wrap(error, 'api.photos.update-batch', 'DB_ERROR');
    }
  })
  .post('/update', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(PhotoUpdateReqSchema, body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { id, updates } = check.output;
    try {
        // Fetch snapshot before update
        const beforeUpdate = await db.query.furnitureItems.findFirst({
            columns: { groupId: true },
            where: eq(furnitureItems.id, id)
        });

        const mappedUpdates = sanitizePhotoPayload(updates as Record<string, unknown>);
        mappedUpdates.updatedAt = new Date();

        if (mappedUpdates.groupId) {
            const groupRows = await db.select({ id: groupsTable.id }).from(groupsTable).where(eq(groupsTable.id, mappedUpdates.groupId as string)).limit(1);
            if (groupRows.length === 0) mappedUpdates.groupId = null;
        }

        // Remove unupdatable keys
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
                    .where(eq(furnitureItems.groupId, current.groupId));
                
                await db.update(groupsTable)
                    .set({ coverPhotoId: id })
                    .where(eq(groupsTable.id, current.groupId));
            }
        }

        let results;
        if (updates.tags && Array.isArray(updates.tags)) {
            const tagIds = updates.tags.map(Number).filter(n => !isNaN(n));
            
            await db.transaction(async (tx) => {
                await tx.delete(photoTags).where(eq(photoTags.photoId, id));
                
                if (tagIds.length > 0) {
                    await tx.insert(photoTags).values(tagIds.map(tid => ({ photoId: id, tagId: tid })));
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
            if (Object.keys(mappedUpdates).length > 0) {
                results = await db.update(furnitureItems).set(mappedUpdates).where(eq(furnitureItems.id, id)).returning();
            } else {
                results = await db.select().from(furnitureItems).where(eq(furnitureItems.id, id)).limit(1);
            }
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
        throw errorFactory.wrap(error, 'api.photos.update', 'DB_ERROR');
    }
  });
