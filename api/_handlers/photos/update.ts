import { Hono } from 'hono';
import * as v from 'valibot';
import { db, furnitureItems, groups as groupsTable } from '../../_lib/db/index.js';
import { eq, inArray, and } from 'drizzle-orm';
import { syncGroupCoversAndCount } from '../../_lib/groups.js';
import { refreshPhotosView } from '../../_lib/db/actions.js';
import { PhotoBatchUpdateReqSchema, PhotoUpdateReqSchema } from '@/shared/apiContractSchema.js';

export const updateHandler = (app: Hono) => {
  app.post('/batch-update', async (c) => {
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
            let nameJson = updates.name;
            if (typeof updates.name === 'string' && (updates.name.startsWith('{') || updates.name.startsWith('['))) {
                try {
                    nameJson = JSON.parse(updates.name);
                } catch (e) {
                    // Not valid JSON
                }
            }

            if (typeof nameJson === 'string') {
                if (nameJson.length > 200) throw new Error('標題超過 200 字上限');
                updates.name = { zh: nameJson };
            } else if (nameJson && typeof nameJson === 'object') {
                for (const lang of ['zh', 'en', 'ms']) {
                   if ((nameJson as any)[lang] && String((nameJson as any)[lang]).length > 200) {
                       throw new Error(`標題(${lang})超過 200 字上限`);
                   }
                }
            }
        }

        const mappedUpdates: Record<string, unknown> = {};

        for (const [key, val] of Object.entries(updates)) {
            let parsedVal = val;
            if (key === 'categoryId' && typeof val === 'string') {
                parsedVal = parseInt(val, 10);
            }
            mappedUpdates[key] = parsedVal;
        }

        const data = await db
            .update(furnitureItems)
            .set(mappedUpdates)
            .where(inArray(furnitureItems.id, ids))
            .returning({ id: furnitureItems.id });

        await refreshPhotosView();

        return c.json({ success: true, data: data.map(d => d.id) });
    } catch (error: unknown) {
        const { errorFactory } = await import('../../_lib/error/AppError.js');
        throw errorFactory.wrap(error, 'api./api/photos/update-batch', 'DB_ERROR');
    }
  });

  app.post('/update', async (c) => {
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
            let nameJson = updates.name;
            if (typeof updates.name === 'string' && (updates.name.startsWith('{') || updates.name.startsWith('['))) {
                try {
                    nameJson = JSON.parse(updates.name);
                } catch (e) {
                    // Not valid JSON
                }
            }

            if (typeof nameJson === 'string') {
                if (nameJson.length > 200) throw new Error('標題超過 200 字上限');
                updates.name = { zh: nameJson };
            } else if (nameJson && typeof nameJson === 'object') {
                for (const lang of ['zh', 'en', 'ms']) {
                   if ((nameJson as any)[lang] && String((nameJson as any)[lang]).length > 200) {
                       throw new Error(`標題(${lang})超過 200 字上限`);
                   }
                }
            }
        }

        const mappedUpdates: Record<string, unknown> = { updatedAt: new Date() };

        for (const [key, val] of Object.entries(updates)) {
            if (['id', 'createdAt', 'updatedAt'].includes(key)) continue;
            let parsedVal = val;
            if (key === 'categoryId' && typeof val === 'string') {
                parsedVal = parseInt(val, 10);
                if (isNaN(parsedVal as number)) parsedVal = null;
            }
            mappedUpdates[key] = parsedVal;
        }

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

        const results = await db.update(furnitureItems).set(mappedUpdates).where(eq(furnitureItems.id, id)).returning();
        const data = results[0] || null;

        // POST-MUTATION: Reconcile covers & counts
        const affectedGroupIds: string[] = [];
        if (beforeUpdate?.groupId) affectedGroupIds.push(beforeUpdate.groupId);
        if (mappedUpdates.groupId) affectedGroupIds.push(String(mappedUpdates.groupId));

        if (affectedGroupIds.length > 0) {
            await syncGroupCoversAndCount(affectedGroupIds);
        }

        await refreshPhotosView();

        return c.json({ success: true, data });
    } catch (error: unknown) {
        const { errorFactory } = await import('../../_lib/error/AppError.js');
        throw errorFactory.wrap(error, 'api./api/photos/update', 'DB_ERROR');
    }
  });
};
