import { Hono } from 'hono';
import { type } from 'arktype';
import { db, furnitureItems, groups as groupsTable } from '../../../src/db/index.js';
import { eq, inArray, and } from 'drizzle-orm';
import { syncGroupCoversAndCount } from '../../_lib/groups.js';
import { PhotoBatchUpdateReqSchema, PhotoUpdateReqSchema } from '../../_shared/apiContractSchema.js';

export const updateHandler = (app: Hono) => {
  app.post('/batch-update', async (c) => {
    const body = await c.req.json();
    const check = PhotoBatchUpdateReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);
    
    const { ids, updates } = check;
    try {
        const mappedUpdates: Record<string, unknown> = {};
        const fieldMap: Record<string, string> = {
            is_hidden: 'isHidden',
            category_id: 'categoryId',
            manufacturer_id: 'manufacturerId',
            group_id: 'groupId',
            is_pinned: 'isPinned',
            is_group_cover: 'isGroupCover'
        };

        for (const [key, val] of Object.entries(updates)) {
            mappedUpdates[fieldMap[key] || key] = val;
        }

        const data = await db
            .update(furnitureItems)
            .set(mappedUpdates)
            .where(inArray(furnitureItems.id, ids))
            .returning({ id: furnitureItems.id });
        
        return c.json({ success: true, data: data.map(d => d.id) });
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        return c.json({ success: false, error: err.message }, 500);
    }
  });

  app.post('/update', async (c) => {
    const body = await c.req.json();
    const check = PhotoUpdateReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { id, updates } = check;
    try {
        // Fetch snapshot before update
        const beforeUpdate = await db.query.furnitureItems.findFirst({
            columns: { groupId: true },
            where: eq(furnitureItems.id, id)
        });

        const updateObj = updates as Record<string, unknown>;
        const mappedUpdates: Record<string, unknown> = { updatedAt: new Date() };
        const fieldMap: Record<string, string> = {
            is_hidden: 'isHidden',
            category_id: 'categoryId',
            manufacturer_id: 'manufacturerId',
            group_id: 'groupId',
            is_pinned: 'isPinned',
            is_group_cover: 'isGroupCover',
            name: 'name',
            description: 'description',
            price: 'price',
            note: 'note',
            type: 'type',
            item_code: 'itemCode',
            manual_code: 'manualCode',
            model_number: 'modelNumber',
            dimensions: 'dimensions'
        };

        for (const [key, val] of Object.entries(updateObj)) {
            mappedUpdates[fieldMap[key] || key] = val;
        }

        // Special handling for group cover
        if (updateObj.is_group_cover === true) {
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

        await db.update(furnitureItems).set(mappedUpdates).where(eq(furnitureItems.id, id));

        // POST-MUTATION: Reconcile covers & counts
        const affectedGroupIds: string[] = [];
        if (beforeUpdate?.groupId) affectedGroupIds.push(beforeUpdate.groupId);
        if (mappedUpdates.groupId) affectedGroupIds.push(String(mappedUpdates.groupId));

        if (affectedGroupIds.length > 0) {
            await syncGroupCoversAndCount(affectedGroupIds);
        }

        return c.json({ success: true });
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        return c.json({ success: false, error: err.message }, 500);
    }
  });
};
