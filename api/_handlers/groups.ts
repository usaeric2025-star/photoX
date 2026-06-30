import { Hono } from 'hono';
import * as v from 'valibot';
import { db, groups as groupsTable, furnitureItems } from '../_lib/db/index.js';
import { eq, and, inArray, isNull, sql } from 'drizzle-orm';
import { GroupReqSchema } from '../../shared/apiContractSchema.js';
import { errorResponse } from '../_lib/response.js';
import { syncGroupCoversAndCount } from '../_lib/groups.js';
import { refreshPhotosView } from '../_lib/db/actions.js';
import { getAllGroups, getGroupById, upsertGroup, deleteGroup } from '../_lib/db/queries/groups.js';

export const groups = new Hono()
  .get('/', async (c) => {
    const isAdminByQuery = c.req.query('isAdminMode') === 'true';
    const data = await getAllGroups({ isAdminMode: isAdminByQuery });
    return c.json({ success: true, data });
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    const data = await getGroupById(id);
    if (!data) return errorResponse(c, 'Not found', 404);
    return c.json({ success: true, data });
  })
  .post('/', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ groupData: GroupReqSchema }), body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { groupData } = check.output;
    const b = body as Record<string, unknown>;
    const inputUserId = (b.userId as string) || (b.user_id as string) || '8ec53131-a589-4b50-beb4-6b5308541e1b';
    
    // Manual mapping to Drizzle schema
    const insertData = {
        ...groupData,
        name: "GROUP",
        status: (groupData.status as "draft" | "confirmed" | "rejected") || 'confirmed',
        userId: inputUserId,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const [data] = await db.insert(groupsTable).values([insertData as unknown as typeof groupsTable.$inferInsert]).returning();
    return c.json({ success: true, data });
  })
  .put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const check = v.safeParse(v.object({ updates: v.omit(GroupReqSchema, ["id"]) }), body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { updates } = check.output;
    const updatesObj = updates as Record<string, unknown>;

    const [data] = await db.update(groupsTable)
        .set({ ...updatesObj, updatedAt: new Date() })
        .where(eq(groupsTable.id, id))
        .returning();
    
    return c.json({ success: true, data });
  })
  .post('/upsert', async (c) => {
    const dbUpdates = await c.req.json() as Record<string, unknown>;

    // Filter out client-side createdAt and updatedAt to let backend handle dates
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(dbUpdates)) {
        if (key !== 'createdAt' && key !== 'updatedAt') {
            cleanUpdates[key] = val;
        }
    }

    // Ensure status gets a fallback
    if (!cleanUpdates.status) {
        cleanUpdates.status = 'confirmed';
    }

    // Ensure userId gets a fallback
    if (!cleanUpdates.userId) {
        cleanUpdates.userId = '8ec53131-a589-4b50-beb4-6b5308541e1b';
    }

    const data = await upsertGroup(cleanUpdates);

    await refreshPhotosView();

    return c.json({ success: true, data });
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    await deleteGroup(id);
    await refreshPhotosView();
    return c.json({ success: true });
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
          photoIds
      } = check.output;
      
      // Ensure groupData has the id aligned with targetGroupId to satisfy TS and db
      const mergedGroupData = { ...(groupData as Record<string, unknown>), id: targetGroupId };
      
      // Optimize: Compute sourceGroupIds and ungroupedValidIds directly on the server
      let sourceGroupIds: string[] = [];
      let ungroupedValidIds: string[] = [];
      let dbUserId: string | null = null;

      if (photoIds && photoIds.length > 0) {
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
        sourceGroupIds = Array.from(new Set(
          sourcePhotos.map(p => p.groupId).filter((gid): gid is string => !!gid && gid !== targetGroupId)
        )) as string[];
        ungroupedValidIds = photoIds.filter(pid => {
          const p = sourcePhotos.find(x => x.id === pid);
          return !p?.groupId;
        });
      }

      const existingGroup = await db.query.groups.findFirst({
          where: eq(groupsTable.id, targetGroupId)
      });

      if (!existingGroup) {
        const { id: _, ...groupDataWithoutId } = mergedGroupData;
        let finalUserId = (userId !== 'staff' && userId) ? userId : dbUserId;
        if (!finalUserId) {
            // Fallback user id
           finalUserId = '8ec53131-a589-4b50-beb4-6b5308541e1b';
        }

        const groupDataToInsert = {
            id: targetGroupId,
            userId: finalUserId,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: ((groupDataWithoutId as Record<string, unknown>).status as string) || 'confirmed',
            name: "GROUP",
            description: ((groupDataWithoutId as Record<string, unknown>).description as string) || null,
            coverPhotoId: ((groupDataWithoutId as Record<string, unknown>).coverPhotoId as string) || null,
        };

        await db.insert(groupsTable).values([groupDataToInsert as unknown as typeof groupsTable.$inferInsert]);
      } else {
        const { id: _, ...groupDataWithoutId } = mergedGroupData;
        const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
        if ((groupDataWithoutId as Record<string, unknown>).name) updatePayload.name = (groupDataWithoutId as Record<string, unknown>).name;
        if ((groupDataWithoutId as Record<string, unknown>).description !== undefined) updatePayload.description = (groupDataWithoutId as Record<string, unknown>).description;
        if ((groupDataWithoutId as Record<string, unknown>).status) updatePayload.status = (groupDataWithoutId as Record<string, unknown>).status;
        if ((groupDataWithoutId as Record<string, unknown>).coverPhotoId !== undefined) updatePayload.coverPhotoId = (groupDataWithoutId as Record<string, unknown>).coverPhotoId;

        await db.update(groupsTable)
            .set(updatePayload)
            .where(eq(groupsTable.id, targetGroupId));
      }

      // Update photos FIRST
      if (ungroupedValidIds && ungroupedValidIds.length > 0) {
        await db.update(furnitureItems)
          .set({ groupId: targetGroupId, isGroupCover: false })
          .where(inArray(furnitureItems.id, ungroupedValidIds));
      }

      // Merge groups
      if (sourceGroupIds && sourceGroupIds.length > 0) {
        // 1. Move ALL photos from source groups to target group
        await db.update(furnitureItems)
          .set({ groupId: targetGroupId, isGroupCover: false })
          .where(inArray(furnitureItems.groupId, sourceGroupIds));

        // 2. Call RPC as a fallback or for metadata cleanup
        try {
            await db.execute(sql`SELECT merge_groups(${sourceGroupIds}, ${targetGroupId})`);
        } catch (rpcErr) {
            // Ignore RPC failure if photos moved manually
        }
      }

      // Reconcile and synchronize
      const affectedGroupIds = [targetGroupId, ...(sourceGroupIds || [])];
      await syncGroupCoversAndCount(affectedGroupIds);
      await refreshPhotosView();

      return c.json({ success: true });
  })
  .post('/move-photos', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ photoIds: v.array(v.string()), targetGroupId: v.nullable(v.string()) }), body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { photoIds, targetGroupId } = check.output;
    // Fetch snapshots before move
    const sourcePhotos = await db.select({ groupId: furnitureItems.groupId })
        .from(furnitureItems)
        .where(inArray(furnitureItems.id, photoIds));
    
    const affectedGroupIds = sourcePhotos.map(p => p.groupId).filter((gid): gid is string => !!gid);
    if (targetGroupId) {
      affectedGroupIds.push(targetGroupId);
    }

    try {
        await db.execute(sql`SELECT move_photos_to_group(${photoIds}, ${targetGroupId})`);
    } catch (rpcErr) {
        // Fallback manual move
        await db.update(furnitureItems)
            .set({ groupId: targetGroupId, isGroupCover: false })
            .where(inArray(furnitureItems.id, photoIds));
    }

    // Reconcile groups
    await syncGroupCoversAndCount(affectedGroupIds);
    await refreshPhotosView();

    return c.json({ success: true });
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

    return c.json({ success: true });
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
        await db.execute(sql`SELECT dissolve_group(${groupId})`);
    } catch (rpcErr) {
        await db.delete(groupsTable).where(eq(groupsTable.id, groupId));
    }

    await refreshPhotosView();

    return c.json({ success: true });
  })
  .post('/sync-count', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ groupId: v.string() }), body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { groupId } = check.output;
    if (!groupId) return c.json({ success: true });
    
    await syncGroupCoversAndCount([groupId]);
    return c.json({ success: true });
  })
  .post('/repair-integrity', async (c) => {
    const groups = await db.select({ id: groupsTable.id }).from(groupsTable);

    let dissolved = 0;
    let synced = 0;
    let deleted = 0;

    for (const group of groups) {
      const [{ count: actualCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(furnitureItems)
        .where(eq(furnitureItems.groupId, group.id));

      if (Number(actualCount) <= 1) {
        if (Number(actualCount) === 1) {
          await db.update(furnitureItems)
            .set({ groupId: null, isGroupCover: false, isPinned: false })
            .where(eq(furnitureItems.groupId, group.id));
          dissolved++;
        }
        await db.delete(groupsTable).where(eq(groupsTable.id, group.id));
        deleted++;
      } else {
        synced++;
      }
    }

    await refreshPhotosView();

    return c.json({ success: true, data: { dissolved, synced, deleted } });
  });
