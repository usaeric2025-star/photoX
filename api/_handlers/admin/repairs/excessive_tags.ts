import { db, photoTags as photoTagsTable, tags as tagsTable, furnitureItems } from '../../../_lib/db/index.js';
import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { normalizeI18n } from '../../../_shared/i18n.js';

export async function previewExcessiveTags(c: Context) {
  const ptData = await db.select().from(photoTagsTable);
  const pData = await db.select({ id: furnitureItems.id, name: furnitureItems.name }).from(furnitureItems);
  const photoMap = new Map<string, { id: string; name: unknown }>(pData.map(p => [p.id, p]));

  const tagData = await db.select({ id: tagsTable.id, name: tagsTable.name, isPinned: tagsTable.isPinned }).from(tagsTable);
  const tagMap = new Map<number, { id: number; name: string | null; isPinned: boolean | null }>(tagData.map(t => [t.id, { id: t.id, name: t.name, isPinned: t.isPinned }]));

  const photoTagGroupMap = new Map<string, number[]>();
  ptData.forEach((pt) => {
    const pid = pt.photoId ?? '';
    const tid = pt.tagId;
    if (tid === null) return;
    if (!photoTagGroupMap.has(pid)) {
      photoTagGroupMap.set(pid, []);
    }
    photoTagGroupMap.get(pid)!.push(tid);
  });

  const affectedPhotos: unknown[] = [];
  const getWeight = (tagId: number, tagDetail?: { id: number; name: string | null; isPinned: boolean | null }) => {
    if (tagDetail && tagDetail.isPinned) return 100;
    return 50;
  };

  photoTagGroupMap.forEach((tagIds, photoId) => {
    if (tagIds.length > 3) {
      const photoItem = photoMap.get(photoId);
      const photoName = photoItem ? (normalizeI18n(photoItem.name as Record<string, unknown>).zh || "未命名产品") : "未知照片";

      const sorted = [...tagIds].sort((a, b) => {
        const weightA = getWeight(a, tagMap.get(a));
        const weightB = getWeight(b, tagMap.get(b));
        if (weightB !== weightA) return weightB - weightA;
        return tagIds.indexOf(a) - tagIds.indexOf(b);
      });

      const kept = sorted.slice(0, 3).map(id => tagMap.get(id)?.name || String(id));
      const removed = sorted.slice(3).map(id => tagMap.get(id)?.name || String(id));

      affectedPhotos.push({
        photoId,
        photoName,
        keptTags: kept,
        removedTags: removed
      });
    }
  });

  return c.json({
    success: true,
    affectedCount: affectedPhotos.length,
    affectedPhotos
  });
}

export async function repairExcessiveTags(c: Context) {
  const ptData = await db.select().from(photoTagsTable);
  const tagData = await db.select({ id: tagsTable.id, name: tagsTable.name, isPinned: tagsTable.isPinned }).from(tagsTable);
  const tagMap = new Map<number, any>(tagData.map(t => [t.id, t]));

  const photoTagGroupMap = new Map<string, number[]>();
  ptData.forEach((pt) => {
    const pid = pt.photoId ?? '';
    const tid = pt.tagId;
    if (tid === null) return;
    if (!photoTagGroupMap.has(pid)) {
      photoTagGroupMap.set(pid, []);
    }
    photoTagGroupMap.get(pid)!.push(tid);
  });

  const excessivePhotos: { photoId: string, tagIds: number[] }[] = [];
  photoTagGroupMap.forEach((tagIds, photoId) => {
    if (tagIds.length > 3) {
      excessivePhotos.push({ photoId, tagIds });
    }
  });

  if (excessivePhotos.length === 0) {
    return c.json({ success: true, count: 0, message: "没有超出限制的照片标签" });
  }

  const getWeightForRepair = (tagId: number, tagDetail?: any) => {
    if (tagDetail && tagDetail.isPinned) return 100;
    return 50;
  };

  let updatedCount = 0;
  for (const item of excessivePhotos) {
    const sorted = [...item.tagIds].sort((a, b) => {
      const weightA = getWeightForRepair(a, tagMap.get(a));
      const weightB = getWeightForRepair(b, tagMap.get(b));
      if (weightB !== weightA) return weightB - weightA;
      return item.tagIds.indexOf(a) - item.tagIds.indexOf(b);
    });

    const keepTagIds = sorted.slice(0, 3);
    await db.delete(photoTagsTable).where(eq(photoTagsTable.photoId, item.photoId));
    
    if (keepTagIds.length > 0) {
      await db.insert(photoTagsTable).values(keepTagIds.map(tagId => ({ photoId: item.photoId, tagId })));
    }
    
    updatedCount++;
  }

  return c.json({ success: true, count: updatedCount, message: `已成功清理 ${updatedCount} 张照片的多余标签，均按权重与先后顺序保留前 3 个标签` });
}
