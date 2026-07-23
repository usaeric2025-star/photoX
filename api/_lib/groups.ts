import { logger } from './logger.js';
import { ErrorFactory } from '../../src/lib/error/ErrorFactory.js';
import { db, furnitureItems, groups as groupsTable } from './db/index.js';
import { eq, inArray, and, isNull, sql } from 'drizzle-orm';

/**
 * Robust Group Integrity and Cover Photos Synchronization (長期維護機制)
 */
export async function syncGroupCoversAndCount(groupIds: string[]): Promise<void> {
  const uniqueGroupIds = Array.from(new Set(groupIds.filter(Boolean)));
  if (uniqueGroupIds.length === 0) return;

  logger.info(`[GroupSync] Batch syncing integrity for ${uniqueGroupIds.length} groups.`);

  try {
    // 1. Fetch all members and group statuses in bulk
    const [allPhotos, allGroups] = await Promise.all([
      db.select({
        id: furnitureItems.id,
        isGroupCover: furnitureItems.isGroupCover,
        createdAt: furnitureItems.createdAt,
        groupId: furnitureItems.groupId
      })
      .from(furnitureItems)
      .where(inArray(furnitureItems.groupId, uniqueGroupIds)),
      db.select({
        id: groupsTable.id,
        coverPhotoId: groupsTable.coverPhotoId,
        createdAt: groupsTable.createdAt
      })
      .from(groupsTable)
      .where(inArray(groupsTable.id, uniqueGroupIds))
    ]);

    const photosByGroup = new Map<string, typeof allPhotos>();
    for (const p of allPhotos) {
      if (!p.groupId) continue;
      const groupPhotos = photosByGroup.get(p.groupId) || [];
      groupPhotos.push(p);
      photosByGroup.set(p.groupId, groupPhotos);
    }

    const groupMap = new Map(allGroups.map(g => [g.id, g]));

    // 2. Process groups sequentially or with minimal concurrency to respect connection pool limits (max 3 in serverless)
    for (const groupId of uniqueGroupIds) {
      try {
        const items = photosByGroup.get(groupId) || [];
        const actualCount = items.length;

        // Rule: Group must have at least 2 members.
        if (actualCount <= 1) {
          const dbGroup = groupMap.get(groupId) as any;
          const createdAt = dbGroup?.createdAt ? new Date(dbGroup.createdAt) : null;
          const isRecentlyCreated = createdAt && (Date.now() - createdAt.getTime() < 5 * 60 * 1000); // 5 minutes

          if (!isRecentlyCreated) {
            if (actualCount === 1) {
              await db.update(furnitureItems)
                .set({ groupId: null, isGroupCover: false, isPinned: false })
                .where(eq(furnitureItems.id, items[0].id));
            }
            await db.delete(groupsTable).where(eq(groupsTable.id, groupId));
            continue;
          }
        }

        const dbGroup = groupMap.get(groupId) as any;
        const dbCoverPhotoId = dbGroup?.coverPhotoId;
        
        const currentCover = items.find(p => p.isGroupCover === true);
        const isCoverValid = currentCover && dbCoverPhotoId === currentCover.id;

        if (!isCoverValid) {
          let targetCoverId = items.find(p => p.id === dbCoverPhotoId)?.id;
          
          if (!targetCoverId) {
            // Pick the latest photo as cover
            const sorted = [...items].sort((a, b) => {
              return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
            });
            targetCoverId = sorted[0]?.id;
          }

          if (targetCoverId) {
            // Update photo table: set this one as cover and others as non-cover
            await db.update(furnitureItems)
              .set({ isGroupCover: false })
              .where(and(eq(furnitureItems.groupId, groupId), sql`${furnitureItems.id} != ${targetCoverId}`));
            
            await db.update(furnitureItems)
              .set({ isGroupCover: true })
              .where(eq(furnitureItems.id, targetCoverId));
          }

          // Update group table
          await db.update(groupsTable)
            .set({
              coverPhotoId: targetCoverId || null,
              updatedAt: new Date()
            })
            .where(eq(groupsTable.id, groupId));
        } else {
          // Just update updatedAt if cover is still valid
          await db.update(groupsTable)
            .set({
              updatedAt: new Date()
            })
            .where(eq(groupsTable.id, groupId));
        }
      } catch (err) {
        logger.error(`[GroupSync] Error processing group ${groupId}:`, err);
      }
    }
  } catch (err) {
    ErrorFactory.handle(err, { context: '[GroupSync] Bulk fetch failed' });
  }
}
