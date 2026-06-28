import { logger } from './logger.js';
import { db, furnitureItems, groups as groupsTable } from '../_lib/db/index.js';
import { eq, inArray, and, isNull } from 'drizzle-orm';

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
        coverPhotoId: groupsTable.coverPhotoId
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

    // 2. Process groups in parallel
    await Promise.all(uniqueGroupIds.map(async (groupId) => {
      try {
        const items = photosByGroup.get(groupId) || [];
        const actualCount = items.length;

        // Rule: Group must have at least 2 members.
        if (actualCount <= 1) {
          if (actualCount === 1) {
            await db.update(furnitureItems)
              .set({ groupId: null, isGroupCover: false, isPinned: false })
              .where(eq(furnitureItems.id, items[0].id));
          }
          await db.delete(groupsTable).where(eq(groupsTable.id, groupId));
          return;
        }

        const dbGroup = groupMap.get(groupId) as any;
        const dbCoverPhotoId = dbGroup?.coverPhotoId;
        
        const currentCover = items.find(p => p.isGroupCover === true);
        const isCoverValid = currentCover && dbCoverPhotoId === currentCover.id;

        if (!isCoverValid) {
          let targetCoverId = items.find(p => p.id === dbCoverPhotoId)?.id;
          
          if (!targetCoverId) {
            const sorted = [...items].sort((a, b) => {
              return new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime();
            });
            targetCoverId = sorted[0]?.id;
          }

          // Batch update cover status for this group
          const updatePromises = [];
          const toSetFalse = items.filter(p => p.isGroupCover && p.id !== targetCoverId);
          if (toSetFalse.length > 0) {
              updatePromises.push(
                  db.update(furnitureItems)
                    .set({ isGroupCover: false })
                    .where(inArray(furnitureItems.id, toSetFalse.map(p => p.id)))
              );
          }
          
          const toSetTrue = items.filter(p => !p.isGroupCover && p.id === targetCoverId);
          if (toSetTrue.length > 0) {
              updatePromises.push(
                  db.update(furnitureItems)
                    .set({ isGroupCover: true })
                    .where(eq(furnitureItems.id, targetCoverId!))
              );
          }
          
          if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
          }

          // Update group table
          await db.update(groupsTable)
            .set({
              coverPhotoId: targetCoverId || null,
              updatedAt: new Date()
            })
            .where(eq(groupsTable.id, groupId));
        }
      } catch (err) {
        logger.error(`[GroupSync] Error in group ${groupId}:`, err);
      }
    }));
  } catch (err) {
    logger.error(`[GroupSync] Bulk fetch failed:`, err);
  }
}
