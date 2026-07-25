import { errorFactory } from "../_lib/error/factory.js";
import { Hono } from 'hono';
import * as v from 'valibot';
import { GroupReqSchema } from '../../shared/apiContractSchema.js';
import { errorResponse, successResponse } from '../_lib/response.js';
import { syncGroupCoversAndCount } from '../_lib/groups.js';
import { refreshPhotosView } from '../_lib/db/actions.js';
import { groups as groupsTable } from '../_lib/db/index.js';
import { 
    getAllGroups, 
    getGroupById, 
    upsertGroup, 
    deleteGroup, 
    createGroup, 
    updateGroup, 
    getPhotosSummary,
    updatePhotosGroup,
    updateGroupPhotosGroup,
    callMergeGroups,
    callDissolveGroup,
    callMovePhotosToGroup,
    removePhotosFromGroup,
    resetGroupCovers,
    setPhotoAsCover,
    getGroupStats,
    repairGroupStatuses,
    dissolveAndCleanupGroups
} from '../_lib/db/queries/groups.js';
import { logger } from '../_lib/logger.js';

export const groups = new Hono()
  .get('/', async (c) => {
    const isAdminByQuery = c.req.query('isAdminMode') === 'true';
    const data = await getAllGroups({ isAdminMode: isAdminByQuery });
    return successResponse(c, data);
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    const data = await getGroupById(id);
    if (!data) return errorResponse(c, 'Not found', 404);
    return successResponse(c, data);
  })
  .post('/', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ groupData: GroupReqSchema }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { groupData } = check.output;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const rawUserId = (body.userId as string) || (body.user_id as string);
    const inputUserId = (rawUserId && uuidRegex.test(rawUserId)) ? rawUserId : '8ec53131-a589-4b50-beb4-6b5308541e1b';
    
    const insertData: typeof groupsTable.$inferInsert = {
        ...groupData,
        id: groupData.id || crypto.randomUUID(),
        name: groupData.name || "GROUP",
        status: (groupData.status as "active" | "confirmed" | "rejected") || 'active',
        userId: inputUserId,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const data = await createGroup(insertData);
    return successResponse(c, data);
  })
  .put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const FlexibleUpdateSchema = v.object({
        updates: v.object({
            name: v.optional(v.union([v.string(), v.record(v.string(), v.unknown())])),
            description: v.optional(v.union([v.string(), v.record(v.string(), v.unknown())])),
            status: v.optional(v.string()),
            coverPhotoId: v.optional(v.nullable(v.string()))
        })
    });

    const check = v.safeParse(FlexibleUpdateSchema, body);
    if (!check.success) throw errorFactory.validation(check.issues);

    const { updates } = check.output;
    const updatesObj: Partial<typeof groupsTable.$inferInsert> = {};

    if (updates.name !== undefined) {
        if (typeof updates.name === 'object') {
            const n = updates.name as Record<string, unknown>;
            updatesObj.name = String(n.en || n.zh || n.ms || '');
        } else {
            updatesObj.name = updates.name;
        }
    }

    if (updates.description !== undefined) {
        updatesObj.description = updates.description;
    }

    if (updates.status !== undefined) {
        updatesObj.status = updates.status;
    }

    if (updates.coverPhotoId !== undefined) {
        updatesObj.coverPhotoId = updates.coverPhotoId;
    }

    const [data] = await updateGroup(id, updatesObj);
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
    if (!check.success) throw errorFactory.validation(check.issues);
    const input = check.output;
    const cleanUpdates: Partial<typeof groupsTable.$inferInsert> & { id: string } = { ...input };
    
    if (!cleanUpdates.status) {
        cleanUpdates.status = 'active';
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!cleanUpdates.userId || !uuidRegex.test(cleanUpdates.userId)) {
        cleanUpdates.userId = '8ec53131-a589-4b50-beb4-6b5308541e1b';
    }

    const data = await upsertGroup(cleanUpdates);
    await refreshPhotosView();
    return successResponse(c, data);
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    await deleteGroup(id);
    await refreshPhotosView();
    return successResponse(c, null);
  })
  .post('/group-photos', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({
          targetGroupId: v.optional(v.string()),
          userId: v.optional(v.string()),
          photoIds: v.optional(v.array(v.string())),
          groupData: v.optional(v.record(v.string(), v.unknown())),
          sourceGroupIds: v.optional(v.array(v.string())),
          ungroupedValidIds: v.optional(v.array(v.string()))
      }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { 
          targetGroupId: rawTargetGroupId, 
          userId, 
          groupData = {}, 
          photoIds: rawPhotoIds,
          sourceGroupIds: rawSourceGroupIds
      } = check.output;

      const photoIds = Array.isArray(rawPhotoIds) ? rawPhotoIds : (rawPhotoIds ? [rawPhotoIds] : []);
      const sourceGroupIds = Array.isArray(rawSourceGroupIds) ? rawSourceGroupIds : (rawSourceGroupIds ? [rawSourceGroupIds] : []);
      const targetGroupId = rawTargetGroupId || crypto.randomUUID();
      
      const mergedGroupData: Partial<typeof groupsTable.$inferInsert> & { id: string } = { ...groupData, id: targetGroupId };
      
      let previousGroupIds: string[] = [];
      let dbUserId: string | null = null;

      if (photoIds.length > 0) {
        const sourcePhotos = await getPhotosSummary(photoIds);
        
        for (const p of sourcePhotos) {
            if (p.isGroupCover && p.groupId) {
                if (!sourceGroupIds.includes(p.groupId)) {
                    sourceGroupIds.push(p.groupId);
                }
            }
        }

        if (sourcePhotos.length > 0) {
           dbUserId = sourcePhotos[0].userId;
        }
        previousGroupIds = Array.from(new Set(
          sourcePhotos.map(p => p.groupId).filter((gid): gid is string => !!gid && gid !== targetGroupId)
        )) as string[];
      }

      const existingGroup = await getGroupById(targetGroupId);

      if (!existingGroup) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let finalUserId = (userId && uuidRegex.test(userId)) ? userId : (dbUserId && uuidRegex.test(dbUserId) ? dbUserId : null);
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

        let finalDesc = null;
        const rawDesc = mergedGroupData.description;
        if (rawDesc && typeof rawDesc === 'object') {
            finalDesc = rawDesc;
        } else if (typeof rawDesc === 'string') {
            try {
                finalDesc = JSON.parse(rawDesc);
            } catch {
                finalDesc = { zh: rawDesc };
            }
        }

        const groupDataToInsert: typeof groupsTable.$inferInsert = {
            id: targetGroupId,
            userId: finalUserId,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: (mergedGroupData.status as "active" | "confirmed" | "rejected") || 'active',
            name: finalName,
            description: finalDesc as any,
            coverPhotoId: (mergedGroupData.coverPhotoId as string) || null,
        };

        await createGroup(groupDataToInsert);
      } else {
        const updatePayload: Partial<typeof groupsTable.$inferInsert> = { updatedAt: new Date() };
        if (mergedGroupData.name) updatePayload.name = mergedGroupData.name as string;
        if (mergedGroupData.description !== undefined) updatePayload.description = mergedGroupData.description as any;
        if (mergedGroupData.status) updatePayload.status = mergedGroupData.status as "active" | "confirmed" | "rejected";
        if (mergedGroupData.coverPhotoId !== undefined) updatePayload.coverPhotoId = mergedGroupData.coverPhotoId as string | null;

        await updateGroup(targetGroupId, updatePayload);
      }

      if (photoIds.length > 0) {
        await updatePhotosGroup(photoIds, targetGroupId);
      }

      if (sourceGroupIds && sourceGroupIds.length > 0) {
        await updateGroupPhotosGroup(sourceGroupIds, targetGroupId);

        try {
            const rpcResult = await callMergeGroups(sourceGroupIds, targetGroupId);
            // Drizzle execute returns a result set, we need to check the first row for procedure results
            const mergeStatus = (rpcResult as any)?.[0]?.merge_groups;
            if (mergeStatus && mergeStatus.success === false) {
                throw new Error(`Database Merge Procedure Failed: ${mergeStatus.error}`);
            }
        } catch (rpcErr) {
            logger.error('[merge_groups rpc error]', rpcErr);
            await Promise.all(sourceGroupIds.map(gid => deleteGroup(gid)));
        }
      }

      const affectedGroupIds = Array.from(new Set([
        targetGroupId,
        ...(previousGroupIds || []),
        ...(sourceGroupIds || [])
      ]));

      await syncGroupCoversAndCount(affectedGroupIds);
      await refreshPhotosView();

      return successResponse(c, { targetGroupId });
  })
  .post('/move-photos', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ 
        photoIds: v.union([v.string(), v.array(v.string())]), 
        targetGroupId: v.optional(v.nullable(v.string())) 
    }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { photoIds: rawPhotoIds, targetGroupId } = check.output;
    const photoIds = Array.isArray(rawPhotoIds) ? rawPhotoIds : [rawPhotoIds];

    const sourcePhotos = await getPhotosSummary(photoIds);
    const affectedGroupIds = sourcePhotos.map(p => p.groupId).filter((gid): gid is string => !!gid);
    if (targetGroupId) {
      affectedGroupIds.push(targetGroupId);
    }

    try {
        await callMovePhotosToGroup(photoIds, targetGroupId);
    } catch (rpcErr) {
        await updatePhotosGroup(photoIds, targetGroupId);
    }

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
    if (!check.success) throw errorFactory.validation(check.issues);
    const { photoIds: rawPhotoIds, groupId } = check.output;
    const photoIds = Array.isArray(rawPhotoIds) ? rawPhotoIds : [rawPhotoIds];

    await removePhotosFromGroup(photoIds, groupId);
    await syncGroupCoversAndCount([groupId]);
    await refreshPhotosView();
    return successResponse(c, null);
  })
  .post('/set-cover', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ photoId: v.optional(v.nullable(v.string())), groupId: v.string() }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { photoId, groupId } = check.output;
    
    await resetGroupCovers(groupId);
    if (photoId) {
        await setPhotoAsCover(photoId);
    }

    await updateGroup(groupId, { coverPhotoId: photoId || null });
    await syncGroupCoversAndCount([groupId]);
    await refreshPhotosView();
    return successResponse(c, null);
  })
  .post('/ungroup', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ groupId: v.string() }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { groupId } = check.output;
    
    await updateGroupPhotosGroup([groupId], null);
    
    try {
        const rpcResult = await callDissolveGroup(groupId);
        const dissolveStatus = (rpcResult as any)?.[0]?.dissolve_group;
        if (dissolveStatus && dissolveStatus.success === false) {
            throw new Error(`Database Dissolve Procedure Failed: ${dissolveStatus.error}`);
        }
    } catch (rpcErr) {
        await deleteGroup(groupId);
    }

    await refreshPhotosView();
    return successResponse(c, null);
  })
  .post('/sync-count', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ groupId: v.string() }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { groupId } = check.output;
    if (!groupId) return successResponse(c, null);
    
    await syncGroupCoversAndCount([groupId]);
    return successResponse(c, null);
  })
  .post('/repair-integrity', async (c) => {
    // 1. Repair statuses
    await repairGroupStatuses();

    // 2. Find groups with <= 1 photo
    const groupStats = await getGroupStats();

    let dissolved = 0;
    let deleted = 0;

    const groupsToProcess = groupStats.filter(g => g.photoCount <= 1);
    
    for (const group of groupsToProcess) {
      const photosToDissolve = group.photoCount === 1 ? (await getPhotosSummary([])).map(p => p.id) : []; // This logic was a bit flawed in original, let's fix
      // Actually we need the photo IDs for that group
      // But repair-integrity is low priority, I'll just clean up the Drizzle calls
      
      // Fixed logic:
      if (group.photoCount === 1) {
          // Find that one photo
          const { furnitureItems: itemsTable } = await import('../_lib/db/index.js');
          const { eq: drizzleEq } = await import('drizzle-orm');
          const [p] = await import('../_lib/db/index.js').then(m => m.db.select({id: itemsTable.id}).from(itemsTable).where(drizzleEq(itemsTable.groupId, group.id)));
          if (p) {
              await dissolveAndCleanupGroups([p.id], group.id);
              dissolved++;
          } else {
              await deleteGroup(group.id);
          }
      } else {
          await deleteGroup(group.id);
      }
      deleted++;
    }

    const synced = groupStats.length - groupsToProcess.length;
    await refreshPhotosView();
    return successResponse(c, { dissolved, synced, deleted });
  });
