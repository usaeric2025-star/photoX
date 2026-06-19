import { Hono } from 'hono';
import { type } from 'arktype';
import { db, groups as groupsTable, furnitureItems } from '../_lib/db/index.js';
import { eq, and, inArray, isNull, sql, asc } from 'drizzle-orm';
import { GroupReqSchema } from '../_shared/apiContractSchema.js';
import { AppError } from '../_lib/error/AppError.js';
import { logger } from '../_lib/logger.js';
import { syncGroupCoversAndCount } from '../_lib/groups.js';

export const groups = new Hono()
  .get('/', async (c) => {
    try {
      const isAdminByQuery = c.req.query('isAdminMode') === 'true';
      let query = db.select().from(groupsTable).orderBy(asc(groupsTable.name));

      if (!isAdminByQuery) {
          query = db.select().from(groupsTable)
            .where(and(
                eq(groupsTable.status, 'confirmed')
            ))
            .orderBy(asc(groupsTable.name)) as any;
      }

      const data = await query;
      return c.json({ success: true, data });
    } catch (error: unknown) {
      return c.json({ success: false, error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) }, 500);
    }
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const data = await db.query.groups.findFirst({
        where: eq(groupsTable.id, id)
      });
      if (!data) return c.json({ success: false, error: 'Not found' }, 404);
      return c.json({ success: true, data });
    } catch (error: unknown) {
      return c.json({ success: false, error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) }, 500);
    }
  })
  .post('/', async (c) => {
    const body = await c.req.json();
    const check = type({ groupData: GroupReqSchema })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { groupData } = check;
    try {
        const inputUserId = (body as any).userId || (body as any).user_id || (groupData as any).userId || (groupData as any).user_id || '8ec53131-a589-4b50-beb4-6b5308541e1b';
        const [data] = await db.insert(groupsTable).values({
            userId: inputUserId,
            ...groupData
        } as any).returning();
        return c.json({ success: true, data });
    } catch (error: unknown) {
        const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        logger.error("[Groups] Insert group failed", { error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)), traceId });
        return c.json({ success: false, error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)), traceId }, 500);
    }
  })
  .put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const check = type({ updates: GroupReqSchema.omit("id") })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { updates } = check;
    delete (updates as any).member_count;

    try {
        const mapped: Record<string, any> = {};
        const fieldMap: Record<string, string> = {
            name: 'name',
            description: 'description',
            cover_photo_id: 'coverPhotoId',
            status: 'status',
            user_id: 'userId'
        };
        for (const [key, val] of Object.entries(updates as Record<string, any>)) {
            const mappedKey = fieldMap[key] || key;
            mapped[mappedKey] = val;
        }

        const [data] = await db.update(groupsTable)
            .set({ ...mapped, updatedAt: new Date() } as any)
            .where(eq(groupsTable.id, id))
            .returning();
        
        return c.json({ success: true, data });
    } catch (error: unknown) {
        const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        logger.error("[Groups] Update group failed", { error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)), id, traceId });
        return c.json({ success: false, error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)), traceId }, 500);
    }
  })
  .post('/upsert', async (c) => {
    const dbUpdates = await c.req.json() as Record<string, any>;
    try {
        const mapped: Record<string, any> = {};
        const fieldMap: Record<string, string> = {
            id: 'id',
            name: 'name',
            description: 'description',
            cover_photo_id: 'coverPhotoId',
            status: 'status',
            user_id: 'userId',
            created_at: 'createdAt',
            updated_at: 'updatedAt'
        };
        for (const [key, val] of Object.entries(dbUpdates)) {
            const mappedKey = fieldMap[key] || key;
            mapped[mappedKey] = val;
        }

        // Ensure status gets a fallback
        if (!mapped.status) {
            mapped.status = 'confirmed';
        }

        // Ensure userId gets a fallback
        if (!mapped.userId) {
            mapped.userId = '8ec53131-a589-4b50-beb4-6b5308541e1b';
        }

        await db.insert(groupsTable)
            .values(mapped as any)
            .onConflictDoUpdate({
                target: groupsTable.id,
                set: mapped as any
            });

        return c.json({ success: true });
    } catch (error: unknown) {
        const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        logger.error("[Groups] Upsert failed", { error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)), traceId });
        return c.json({ success: false, error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)), traceId }, 500);
    }
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    try {
        await db.delete(groupsTable).where(eq(groupsTable.id, id));
        return c.json({ success: true });
    } catch (error: unknown) {
        const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        logger.error("[Groups] Delete failed", { error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)), id, traceId });
        return c.json({ success: false, error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)), traceId }, 500);
    }
  })
  .post('/group-photos', async (c) => {
      const body = await c.req.json();
      logger.debug('--- GROUP PHOTOS JSON BODY ---', body);
      const check = type({
          targetGroupId: "string",
          userId: "string",
          "photoIds?": "string[]",
          groupData: "object",
          "sourceGroupIds?": "string[]",
          "ungroupedValidIds?": "string[]"
      })(body);
      if (check instanceof type.errors) throw new Error(check.summary);

      const { 
          targetGroupId, 
          userId, 
          groupData, 
          photoIds
      } = check;
      
      // Ensure groupData has the id aligned with targetGroupId to satisfy TS and db
      const mergedGroupData = { ...groupData, id: targetGroupId };
      delete (mergedGroupData as any).member_count;
      
      try {
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
            const { id: _, ...groupDataWithoutId } = mergedGroupData as any;
            let finalUserId = (userId !== 'staff' && userId) ? userId : dbUserId;
            if (!finalUserId) {
                // Fallback user id
               finalUserId = '8ec53131-a589-4b50-beb4-6b5308541e1b';
            }

            await db.insert(groupsTable).values({
                id: targetGroupId,
                userId: finalUserId,
                ...groupDataWithoutId,
                createdAt: new Date()
            } as any);
          } else {
            const { id: _, ...groupDataWithoutId } = mergedGroupData as any;
            await db.update(groupsTable)
                .set({ ...groupDataWithoutId, updatedAt: new Date() } as any)
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
                logger.warn("[groupPhotos] Merge RPC call failed, but photos already moved manually", { error: (rpcErr as any).message });
            }
          }

          // Reconcile and synchronize
          const affectedGroupIds = [targetGroupId, ...(sourceGroupIds || [])];
          await syncGroupCoversAndCount(affectedGroupIds);

          return c.json({ success: true });
      } catch (err: unknown) {
        const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        logger.error("[groupPhotos] Operation failed", { error: (err instanceof Error ? err.message : String(err)), traceId });
        return c.json({ success: false, error: (err instanceof Error ? err.message : String(err)), traceId }, 500);
      }
  })
  .post('/move-photos', async (c) => {
    const body = await c.req.json();
    const check = type({ photoIds: "string[]", targetGroupId: "string|null" })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { photoIds, targetGroupId } = check;
    try {
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

        return c.json({ success: true });
    } catch (error: unknown) {
        const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        logger.error("[movePhotos] Operation failed", { error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)), traceId });
        return c.json({ success: false, error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)), traceId }, 500);
    }
  })
  .post('/set-cover', async (c) => {
    const body = await c.req.json();
    const check = type({ photoId: "string|null", groupId: "string" })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { photoId, groupId } = check;
    try {
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

        return c.json({ success: true });
    } catch (error: unknown) {
        const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        logger.error("[setCover] Cover update failed", { error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)), traceId });
        return c.json({ success: false, error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)), traceId }, 500);
    }
  })
  .post('/ungroup', async (c) => {
    const body = await c.req.json();
    const check = type({ groupId: "string" })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { groupId } = check;
    try {
        await db.update(furnitureItems)
            .set({ groupId: null, isGroupCover: false })
            .where(eq(furnitureItems.groupId, groupId));
        
        try {
            await db.execute(sql`SELECT dissolve_group(${groupId})`);
        } catch (rpcErr) {
            await db.delete(groupsTable).where(eq(groupsTable.id, groupId));
        }

        return c.json({ success: true });
    } catch (error: unknown) {
        const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        logger.error("[ungroup] Dissolve failed", { error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)), traceId });
        return c.json({ success: false, error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)), traceId }, 500);
    }
  })
  .post('/sync-count', async (c) => {
    const body = await c.req.json();
    const check = type({ groupId: "string" })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { groupId } = check;
    if (!groupId) return c.json({ success: true });
    
    try {
        await syncGroupCoversAndCount([groupId]);
        return c.json({ success: true });
    } catch (error: unknown) {
        return c.json({ success: false, error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) }, 500);
    }
  })
  .post('/repair-integrity', async (c) => {
    try {
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

        return c.json({ success: true, data: { dissolved, synced, deleted } });
    } catch (error: unknown) {
        const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        return c.json({ success: false, error: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)), traceId }, 500);
    }
  });
