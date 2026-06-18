import { pgMaterializedView, uuid, text, jsonb, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { db } from './index.js';
import { logger } from '../logger.js';

export const vPhotosList = pgMaterializedView('v_photos_list', {
  id: uuid('id').primaryKey(),
  name: jsonb('name'),
  description: jsonb('description'),
  imageUrl: text('image_url'),
  groupId: uuid('group_id'),
  groupName: text('group_name'),
  groupCoverPhotoId: uuid('group_cover_photo_id'),
  isHidden: boolean('is_hidden'),
  isPinned: boolean('is_pinned'),
  isGroupCover: boolean('is_group_cover'),
  categoryId: uuid('category_id'),
  manufacturerId: uuid('manufacturer_id'),
  manualCode: text('manual_code'),
  modelNumber: text('model_number'),
  itemCode: text('item_code'),
  createdAt: timestamp('created_at'),
  tags: text('tags').array().notNull(),
  tagIds: integer('tag_ids').array().notNull(),
  categoryNameZh: text('category_name_zh'),
  categoryNameEn: text('category_name_en'),
  categoryNameMs: text('category_name_ms'),
}).as(sql`
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
  GROUP BY p.id, g.id, c.id
`);

export async function refreshPhotosView() {
  try {
    // Concurrent refresh: non-blocking, requiring unique index on materialized view.
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY v_photos_list`);
    logger.info('[View Refresh] Materialized view v_photos_list updated concurrently');
  } catch (err: any) {
    logger.warn('[View Refresh] Concurrent refresh failed, trying simple refresh:', err);
    try {
      await db.execute(sql`REFRESH MATERIALIZED VIEW v_photos_list`);
      logger.info('[View Refresh] Materialized view v_photos_list updated successfully with simple refresh');
    } catch (fallbackErr: any) {
      logger.error('[View Refresh] Fallback refresh failed:', fallbackErr);
    }
  }
}
