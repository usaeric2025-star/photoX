import { db, groups as groupsTable, furnitureItems } from '../../../_lib/db/index.js';
import { inArray, eq } from 'drizzle-orm';
import type { Context } from 'hono';

export async function repairGroupCoverMismatch(c: Context) {
  const groups = await db.select({ id: groupsTable.id, name: groupsTable.name, coverPhotoId: groupsTable.coverPhotoId }).from(groupsTable);
  const photos = await db.select({ id: furnitureItems.id, name: furnitureItems.name, groupId: furnitureItems.groupId, isGroupCover: furnitureItems.isGroupCover, createdAt: furnitureItems.createdAt }).from(furnitureItems);

  const photosByGroup = new Map<string, any[]>();
  photos.forEach((p) => {
    if (p.groupId) {
      const gid = p.groupId;
      if (!photosByGroup.has(gid)) photosByGroup.set(gid, []);
      photosByGroup.get(gid)!.push(p);
    }
  });

  const groupUpdates: { id: string; coverPhotoId: string | null }[] = [];
  const photosToCover: string[] = [];
  const photosToUncover: string[] = [];

  let count = 0;
  for (const g of groups) {
    const gPhotos = photosByGroup.get(g.id) || [];
    if (gPhotos.length === 0) {
      if (g.coverPhotoId) {
        groupUpdates.push({ id: g.id, coverPhotoId: null });
        count++;
      }
      continue;
    }

    const coverPhotoInGroup = gPhotos.find((p) => p.id === g.coverPhotoId);
    const markedCovers = gPhotos.filter((p) => p.isGroupCover === true);

    const isConsistent = coverPhotoInGroup && markedCovers.length === 1 && markedCovers[0].id === g.coverPhotoId;

    if (!isConsistent) {
      let targetCoverId = g.coverPhotoId;
      const photoMarkedAsCover = markedCovers[0] || coverPhotoInGroup;
      
      if (photoMarkedAsCover) {
        targetCoverId = photoMarkedAsCover.id;
      } else {
        const sorted = [...gPhotos].sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
        targetCoverId = sorted[0].id;
      }

      if (g.coverPhotoId !== targetCoverId) {
        groupUpdates.push({ id: g.id, coverPhotoId: targetCoverId });
      }

      for (const p of gPhotos) {
        const shouldBeCover = p.id === targetCoverId;
        if (p.isGroupCover !== shouldBeCover) {
          if (shouldBeCover) {
            photosToCover.push(p.id);
          } else {
            photosToUncover.push(p.id);
          }
        }
      }
      count++;
    }
  }

  if (photosToCover.length > 0) {
    await db.update(furnitureItems).set({ isGroupCover: true }).where(inArray(furnitureItems.id, photosToCover));
  }
  if (photosToUncover.length > 0) {
    await db.update(furnitureItems).set({ isGroupCover: false }).where(inArray(furnitureItems.id, photosToUncover));
  }

  for (const update of groupUpdates) {
    await db.update(groupsTable).set({ coverPhotoId: update.coverPhotoId }).where(eq(groupsTable.id, update.id));
  }

  return c.json({ success: true, count, message: `已成功修复 ${count} 个合组的封面配置` });
}
