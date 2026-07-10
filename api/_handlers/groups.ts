import { Hono } from 'hono';
import * as v from 'valibot';
import { db, groups as groupsTable, furnitureItems } from '../_lib/db/index.js';
import { eq, and, or, inArray, isNull, sql } from 'drizzle-orm';
import { GroupReqSchema } from '../../shared/apiContractSchema.js';
import { errorResponse, successResponse } from '../_lib/response.js';
import { syncGroupCoversAndCount } from '../_lib/groups.js';
import { refreshPhotosView } from '../_lib/db/actions.js';
import { getAllGroups, getGroupById, upsertGroup, deleteGroup } from '../_lib/db/queries/groups.js';
import { logger } from '../_lib/logger.js';

export const groups = new Hono()
  .get('/', async (c) => {
    const isAdminByQuery = c.req.query('isAdminMode') === 'true';
    const data = await getAllGroups({ isAdminMode: isAdminByQuery });
    return successResponse(c, data);
  })
  .get('/:id{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}', async (c) => {
    const id = c.req.param('id');
    const data = await getGroupById(id);
    if (!data) return errorResponse(c, 'Not found', 404);
    return successResponse(c, data);
  })
  .post('/', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ groupData: GroupReqSchema }), body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { groupData } = check.output;
    const inputUserId = (body.userId as string) || (body.user_id as string) || '8ec53131-a589-4b50-beb4-6b5308541e1b';
    
    // Manual mapping to Drizzle schema
    const insertData = {
        ...groupData,
        name: groupData.name || "GROUP",
        status: (groupData.status as "active" | "confirmed" | "rejected") || 'active',
        userId: inputUserId,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const [data] = await db.insert(groupsTable).values(insertData).returning();
    return successResponse(c, data);
  })
  .put('/:id{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    // Use flexible schema to allow objects for name/description (will be normalized)
    const FlexibleUpdateSchema = v.object({
        updates: v.object({
            name: v.optional(v.union([v.string(), v.record(v.string(), v.unknown())])),
            description: v.optional(v.union([v.string(), v.record(v.string(), v.unknown())])),
            status: v.optional(v.string()),
            coverPhotoId: v.optional(v.nullable(v.string()))
        })
    });

    const check = v.safeParse(FlexibleUpdateSchema, body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { updates } = check.output;
    const updatesObj: any = { ...updates };

    // Normalize name to string
    if (updatesObj.name && typeof updatesObj.name === 'object') {
        const n = updatesObj.name as Record<string, unknown>;
        updatesObj.name = String(n.en || n.zh || n.ms || '');
    }

    // Normalize description to string
    if (updatesObj.description && typeof updatesObj.description === 'object') {
        updatesObj.description = JSON.stringify(updatesObj.description);
    }

    const [data] = await db.update(groupsTable)
        .set({ ...updatesObj, updatedAt: new Date() })
        .where(eq(groupsTable.id, id))
        .returning();
    
    return successResponse(c, data);
  })
  .post('/upsert', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({
        id: v.string(),
        name: v.optional(v.string()),
        description: v.optional(v.nullable(v.union([v.string(), v.record(v.string(), v.unknown())]))),
        status: v.optional(v.string()),
        userId: v.optional(v.string()),
        coverPhotoId: v.optional(v.nullable(v.string()))
    }), body);
    
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const input = check.output;
    const cleanUpdates: any = { ...input };
    
    // Normalize description
    if (cleanUpdates.description && typeof cleanUpdates.description === 'object') {
        cleanUpdates.description = JSON.stringify(cleanUpdates.description);
    }

    // Ensure status gets a fallback
    if (!cleanUpdates.status) {
        cleanUpdates.status = 'active';
    }

    // Ensure userId gets a fallback
    if (!cleanUpdates.userId) {
        cleanUpdates.userId = '8ec53131-a589-4b50-beb4-6b5308541e1b';
    }

    const data = await upsertGroup(cleanUpdates);

    await refreshPhotosView();

    return successResponse(c, data);
  })
  .delete('/:id{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}', async (c) => {
    const id = c.req.param('id');
    await deleteGroup(id);
    await refreshPhotosView();
    return successResponse(c, null);
  })
  .post('/group-photos', async (c) => {
      const body = await c.req.json();
      const check = v.safeParse(v.object({
          targetGroupId: v.string(),
          userId: v.string(),
          photoIds: v.optional(v.array(v.string())),
          groupData: v.record(v.string(), v.unknown()),
          sourceGroupIds: v.optional(v.array(v.string())),
          ungroupedValidIds: v.optional(v.array(v.string()))
      }), body);
      if (!check.success) return errorResponse(c, check.issues[0].message, 400);

      const { 
          targetGroupId, 
          userId, 
          groupData, 
          photoIds: rawPhotoIds,
          sourceGroupIds: rawSourceGroupIds
      } = check.output;

      const photoIds = Array.isArray(rawPhotoIds) ? rawPhotoIds : (rawPhotoIds ? [rawPhotoIds] : []);
      const sourceGroupIds = Array.isArray(rawSourceGroupIds) ? rawSourceGroupIds : (rawSourceGroupIds ? [rawSourceGroupIds] : []);
      
      const mergedGroupData: any = { ...groupData, id: targetGroupId };
      
      let finalSourceGroupIds: string[] = [];
      let ungroupedValidIds: string[] = [];
      let dbUserId: string | null = null;

      if (photoIds.length > 0) {
        const sourcePhotos = await db.select({
            id: furnitureItems.id,
            groupId: furnitureItems.groupId,
            userId: furnitureItems.userId
        })
        .from(furnitureItems)
        .where(inArray(furnitureItems.id, photoIds));

        if (sourcePhotos.length > 0) {
           dbUserId = sourcePhotos[0].userId;
        }
        finalSourceGroupIds = Array.from(new Set([
          ...sourceGroupIds,
          ...sourcePhotos.map(p => p.groupId).filter((gid): gid is string => !!gid && gid !== targetGroupId)
        ])) as string[];
        ungroupedValidIds = photoIds.filter(pid => {
          const p = sourcePhotos.find(x => x.id === pid);
          return !p?.groupId;
        });
      }

      const existingGroup = await db.query.groups.findFirst({
          where: eq(groupsTable.id, targetGroupId)
      });

      if (!existingGroup) {
        let finalUserId = (userId !== 'staff' && userId) ? userId : dbUserId;
        if (!finalUserId) {
           finalUserId = '8ec53131-a589-4b50-beb4-6b5308541e1b';
        }

        let finalName = "GROUP";
        const rawName = mergedGroupData.name;
        if (typeof rawName === 'string') {
            finalName = rawName;
        } else if (rawName && typeof rawName === 'object') {
            const n = rawName as Record<string, unknown>;
            finalName = String(n.en || n.zh || n.ms || '');
        }

        let finalDesc: string | null = null;
        const rawDesc = mergedGroupData.description;
        if (typeof rawDesc === 'string') {
            finalDesc = rawDesc;
        } else if (rawDesc && typeof rawDesc === 'object') {
            finalDesc = JSON.stringify(rawDesc);
        }

        const groupDataToInsert: typeof groupsTable.$inferInsert = {
            id: targetGroupId,
            userId: finalUserId,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'active',
            name: finalName,
            description: finalDesc,
            coverPhotoId: (mergedGroupData.coverPhotoId as string) || null,
        };

        await db.insert(groupsTable).values([groupDataToInsert]);
      } else {
        const updatePayload: Partial<typeof groupsTable.$inferInsert> = { updatedAt: new Date() };
        if (mergedGroupData.name) updatePayload.name = mergedGroupData.name;
        if (mergedGroupData.description !== undefined) updatePayload.description = mergedGroupData.description;
        if (mergedGroupData.status) updatePayload.status = mergedGroupData.status;
        if (mergedGroupData.coverPhotoId !== undefined) updatePayload.coverPhotoId = mergedGroupData.coverPhotoId;

        await db.update(groupsTable)
            .set(updatePayload)
            .where(eq(groupsTable.id, targetGroupId));
      }

      if (ungroupedValidIds && ungroupedValidIds.length > 0) {
        await db.update(furnitureItems)
          .set({ groupId: targetGroupId, isGroupCover: false })
          .where(inArray(furnitureItems.id, ungroupedValidIds));
      }

      if (finalSourceGroupIds && finalSourceGroupIds.length > 0) {
        await db.update(furnitureItems)
          .set({ groupId: targetGroupId, isGroupCover: false })
          .where(inArray(furnitureItems.groupId, finalSourceGroupIds));

        try {
            const idsSql = sql.join(finalSourceGroupIds.map(id => sql`${id}::uuid`), sql`, `);
            const rpcResult = await db.execute(sql`SELECT merge_groups(ARRAY[${idsSql}], ${targetGroupId}::uuid)`) as any[];
            const mergeStatus = rpcResult?.[0]?.merge_groups;
            if (mergeStatus && mergeStatus.success === false) {
                throw new Error(`Database Merge Procedure Failed: ${mergeStatus.error}`);
            }
        } catch (rpcErr) {
            logger.error('[merge_groups rpc error]', rpcErr);
            // Fallback: manually delete the empty source groups
            await db.delete(groupsTable)
                .where(inArray(groupsTable.id, finalSourceGroupIds));
        }
      }

      const affectedGroupIds = [targetGroupId, ...(finalSourceGroupIds || [])];
      await syncGroupCoversAndCount(affectedGroupIds);
      await refreshPhotosView();

      return successResponse(c, null);
  })
  .post('/move-photos', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ 
        photoIds: v.union([v.string(), v.array(v.string())]), 
        targetGroupId: v.nullable(v.string()) 
    }), body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { photoIds: rawPhotoIds, targetGroupId } = check.output;
    const photoIds = Array.isArray(rawPhotoIds) ? rawPhotoIds : [rawPhotoIds];

    // Fetch snapshots before move
    const sourcePhotos = await db.select({ groupId: furnitureItems.groupId })
        .from(furnitureItems)
        .where(inArray(furnitureItems.id, photoIds));
    
    const affectedGroupIds = sourcePhotos.map(p => p.groupId).filter((gid): gid is string => !!gid);
    if (targetGroupId) {
      affectedGroupIds.push(targetGroupId);
    }

    try {
        const idsSql = sql.join(photoIds.map(id => sql`${id}::uuid`), sql`, `);
        await db.execute(sql`SELECT move_photos_to_group(ARRAY[${idsSql}], ${targetGroupId}::uuid)`);
    } catch (rpcErr) {
        // Fallback manual move
        await db.update(furnitureItems)
            .set({ groupId: targetGroupId, isGroupCover: false })
            .where(inArray(furnitureItems.id, photoIds));
    }

    // Reconcile groups
    await syncGroupCoversAndCount(affectedGroupIds);
    await refreshPhotosView();

    return successResponse(c, null);
  })
  .post('/remove-photos', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ 
        photoIds: v.union([v.string(), v.array(v.string())]), 
        groupId: v.string() 
    }), body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { photoIds: rawPhotoIds, groupId } = check.output;
    const photoIds = Array.isArray(rawPhotoIds) ? rawPhotoIds : [rawPhotoIds];

    await db.update(furnitureItems)
        .set({ groupId: null, isGroupCover: false })
        .where(and(
            eq(furnitureItems.groupId, groupId),
            inArray(furnitureItems.id, photoIds)
        ));

    await syncGroupCoversAndCount([groupId]);
    await refreshPhotosView();

    return successResponse(c, null);
  })
  .post('/set-cover', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ photoId: v.nullable(v.string()), groupId: v.string() }), body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { photoId, groupId } = check.output;
    await db.update(furnitureItems)
        .set({ isGroupCover: false })
        .where(eq(furnitureItems.groupId, groupId));
    
    if (photoId) {
        await db.update(furnitureItems)
            .set({ isGroupCover: true })
            .where(eq(furnitureItems.id, photoId));
    }

    await db.update(groupsTable)
        .set({ coverPhotoId: photoId || null, updatedAt: new Date() })
        .where(eq(groupsTable.id, groupId));

    // Keep strict integrity
    await syncGroupCoversAndCount([groupId]);
    await refreshPhotosView();

    return successResponse(c, null);
  })
  .post('/ungroup', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ groupId: v.string() }), body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { groupId } = check.output;
    await db.update(furnitureItems)
        .set({ groupId: null, isGroupCover: false })
        .where(eq(furnitureItems.groupId, groupId));
    
    try {
        const rpcResult = await db.execute(sql`SELECT dissolve_group(${groupId}::uuid)`) as any[];
        const dissolveStatus = rpcResult?.[0]?.dissolve_group;
        if (dissolveStatus && dissolveStatus.success === false) {
            throw new Error(`Database Dissolve Procedure Failed: ${dissolveStatus.error}`);
        }
    } catch (rpcErr) {
        await db.delete(groupsTable).where(eq(groupsTable.id, groupId));
    }

    await refreshPhotosView();

    return successResponse(c, null);
  })
  .post('/sync-count', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ groupId: v.string() }), body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { groupId } = check.output;
    if (!groupId) return successResponse(c, null);
    
    await syncGroupCoversAndCount([groupId]);
    return successResponse(c, null);
  })
  .post('/repair-integrity', async (c) => {
    // 1. Fix schema constraint
    try {
        await db.execute(sql`ALTER TABLE ai_audit_logs ALTER COLUMN photo_id DROP NOT NULL`);
    } catch (e) {
        // Ignore if already nullable
    }

    // 2. Set all draft/confirmed to active
    await db.update(groupsTable)
        .set({ status: 'active' })
        .where(or(eq(groupsTable.status, 'confirmed'), eq(groupsTable.status, 'draft')));

    // 3. Optimize: Find groups with <= 1 photo using a single query
    const groupStats = await db.select({
        id: groupsTable.id,
        photoCount: sql<number>`cast(count(${furnitureItems.id}) as int)`
    })
    .from(groupsTable)
    .leftJoin(furnitureItems, eq(groupsTable.id, furnitureItems.groupId))
    .groupBy(groupsTable.id);

    let dissolved = 0;
    let synced = 0;
    let deleted = 0;

    const groupsToProcess = groupStats.filter(g => g.photoCount <= 1);
    
    for (const group of groupsToProcess) {
      if (group.photoCount === 1) {
        await db.update(furnitureItems)
          .set({ groupId: null, isGroupCover: false, isPinned: false })
          .where(eq(furnitureItems.groupId, group.id));
        dissolved++;
      }
      await db.delete(groupsTable).where(eq(groupsTable.id, group.id));
      deleted++;
    }

    synced = groupStats.length - groupsToProcess.length;

    await refreshPhotosView();

    return successResponse(c, { dissolved, synced, deleted });
  });
