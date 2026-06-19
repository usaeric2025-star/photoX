import { db, furnitureItems, groups as groupsTable } from '../../../_lib/db/index.js';
import { inArray, eq, sql, or, isNull, and } from 'drizzle-orm';
import type { Context } from 'hono';
import { normalizeI18n } from '../../../_shared/i18n.js';

export async function repairMissingUrls(c: Context) {
  const records = await db.select({ id: furnitureItems.id })
    .from(furnitureItems)
    .where(isNull(furnitureItems.imageUrl));

  const ids = records.map((r) => r.id);
  if (ids.length > 0) {
    await db.delete(furnitureItems).where(inArray(furnitureItems.id, ids));
  }
  return c.json({ success: true, message: `无链接记录清理完成: ${ids.length}条` });
}

export async function repairGhostRecords(c: Context) {
  const ghosts = await db.select({ id: furnitureItems.id })
    .from(furnitureItems)
    .where(and(isNull(furnitureItems.imageUrl), isNull(furnitureItems.imageHash)));
  
  const ids = ghosts.map((g) => g.id);
  if (ids.length > 0) {
    await db.delete(furnitureItems).where(inArray(furnitureItems.id, ids));
  }
  return c.json({ success: true, message: `完全幽灵记录清理完成: ${ids.length}条` });
}

export async function forceDeleteMissingHashes(c: Context) {
  const targets = await db.select({ id: furnitureItems.id })
    .from(furnitureItems)
    .where(or(isNull(furnitureItems.imageHash), eq(furnitureItems.imageHash, "")));
  
  const ids = targets.map((t) => t.id);
  if (ids.length > 0) {
    await db.delete(furnitureItems).where(inArray(furnitureItems.id, ids));
  }
  return c.json({ success: true, message: `已强制删除 ${ids.length} 条缺失哈希的损坏记录` });
}

export async function repairEmptyGroups(c: Context) {
  const photos = await db.select({ groupId: furnitureItems.groupId }).from(furnitureItems);
  const photoGroupIds = new Set(photos.map((p) => p.groupId).filter(Boolean));
  const groups = await db.select({ id: groupsTable.id }).from(groupsTable);
  const emptyGroupIds = groups.filter((g) => !photoGroupIds.has(g.id)).map((g) => g.id);
  if (emptyGroupIds.length > 0) await db.delete(groupsTable).where(inArray(groupsTable.id, emptyGroupIds));
  return c.json({ success: true, message: `清理了 ${emptyGroupIds.length} 个空合组` });
}

export async function repairNonStandardItemCodes(c: Context) {
  const targets = await db.select({ id: furnitureItems.id, itemCode: furnitureItems.itemCode })
    .from(furnitureItems)
    .where(sql`${furnitureItems.itemCode} IS NOT NULL`);
  
  const compliantRegex = /^X-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
  const legacyPhotos = targets.filter((p) => p.itemCode && !compliantRegex.test(p.itemCode));
  
  if (legacyPhotos.length === 0) return c.json({ success: true, count: 0, message: "所有编号已规范" });
  
  // Process max 50
  const batch = legacyPhotos.slice(0, 50);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  
  for (const p of batch) {
    let random = '';
    for (let i = 0; i < 8; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    await db.update(furnitureItems).set({ itemCode: `X-${random}` }).where(eq(furnitureItems.id, p.id));
  }

  return c.json({ success: true, count: batch.length, message: `已规范 ${batch.length} 条编号格式` });
}

export async function repairI18nNames(c: Context) {
  const items = await db.select({ id: furnitureItems.id, name: furnitureItems.name, description: furnitureItems.description }).from(furnitureItems);
  const itemsToFix = items.filter((i) => typeof i.name === 'string' || (i.name && !(i.name as Record<string, unknown>).zh));
  
  for (const item of itemsToFix) {
    await db.update(furnitureItems).set({
      name: normalizeI18n(item.name as any) as any,
      description: normalizeI18n(item.description as any) as any
    }).where(eq(furnitureItems.id, item.id));
  }
  return c.json({ success: true, message: `已修复 ${itemsToFix.length} 个单品的语种格式` });
}

export async function schemaSync(c: Context) {
  try {
    await db.execute(sql`ALTER TABLE furniture_items DROP COLUMN IF EXISTS group_order;`);
    await db.execute(sql`ALTER TABLE furniture_items ADD COLUMN IF NOT EXISTS description_translations JSONB;`);
    await db.execute(sql`ALTER TABLE furniture_items ADD COLUMN IF NOT EXISTS is_analyzing BOOLEAN DEFAULT FALSE;`);
    await db.execute(sql`ALTER TABLE furniture_items ADD COLUMN IF NOT EXISTS sub_category TEXT;`);
    await db.execute(sql`ALTER TABLE furniture_items ADD COLUMN IF NOT EXISTS dimensions JSONB;`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed';`);
    
    return c.json({ success: true, message: "資料庫 Schema 同步完成（已移除 group_order，補全 description_translations, is_analyzing, sub_category, status 欄位）" });
  } catch (err: unknown) {
    return c.json({ success: false, error: "Schema 同步失敗: " + (err instanceof Error ? err.message : String(err)) }, 500);
  }
}

export async function rebuildViews(c: Context) {
  try {
    await db.execute(sql`DROP MATERIALIZED VIEW IF EXISTS v_photos_list CASCADE`);
    await db.execute(sql`
      CREATE MATERIALIZED VIEW v_photos_list AS
      SELECT 
        p.id, 
        p.name, 
        p.description,
        p.image_url,
        p.group_id, 
        g.name AS group_name,
        g.cover_photo_id AS group_cover_photo_id,
        p.is_hidden,
        p.is_pinned,
        p.is_group_cover,
        p.category_id,
        p.manufacturer_id,
        p.manual_code,
        p.model_number,
        p.item_code,
        p.created_at,
        COALESCE(ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tags,
        COALESCE(ARRAY_AGG(t.id) FILTER (WHERE t.id IS NOT NULL), '{}') AS tag_ids,
        c.name_zh AS category_name_zh,
        c.name_en AS category_name_en,
        c.name_ms AS category_name_ms
      FROM furniture_items p
      LEFT JOIN groups g ON g.id = p.group_id
      LEFT JOIN photo_tags pt ON pt.photo_id = p.id
      LEFT JOIN tags t ON t.id = pt.tag_id
      LEFT JOIN categories c ON c.id = p.category_id
      GROUP BY p.id, g.id, c.id;
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_v_photos_list_id ON v_photos_list (id)`);
    return c.json({ success: true, count: 1, message: "Materialized View v_photos_list 已成功重建並適配新的 UUID 架構" });
  } catch (err: unknown) {
      return c.json({ success: false, message: "Rebuild failed: " + (err instanceof Error ? err.message : String(err)) }, 500);
  }
}
