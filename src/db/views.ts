import { pgView, uuid, text } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { furnitureItems } from './schema';

// 定義物化視圖結構，供 Drizzle 讀取
export const vPhotosList = pgView('v_photos_list', {
  id: uuid('id').primaryKey(),
  title: text('title'),
  url: text('url'),
  thumbnailUrl: text('thumbnail_url'),
  groupId: uuid('group_id'),
  groupName: text('group_name'),
  tags: text('tags').array(),
}).as(sql`
  SELECT 
    p.id, p.name AS title, p.image_url AS url, p.image_url AS thumbnail_url,
    g.id AS group_id, g.name AS group_name,
    ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL) AS tags
  FROM furniture_items p
  LEFT JOIN groups g ON g.id = p.group_id
  LEFT JOIN photo_tags pt ON pt.photo_id = p.id
  LEFT JOIN tags t ON t.id = pt.tag_id
  GROUP BY p.id, g.id
`);
