import { pgMaterializedView, uuid, text, jsonb, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { logger } from '../logger.js';

export const vPhotosList = pgMaterializedView('v_photos_list', {
  id: uuid('id').primaryKey(),
  name: jsonb('name'),
  description: jsonb('description'),
  imageUrl: text('image_url'),
  blurhash: text('blurhash'),
  groupId: uuid('group_id'),
  groupName: text('group_name'),
  groupCoverPhotoId: uuid('group_cover_photo_id'),
  isHidden: boolean('is_hidden'),
  isPinned: boolean('is_pinned'),
  isGroupCover: boolean('is_group_cover'),
  categoryId: integer('category_id'),
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
    p.blurhash,
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
