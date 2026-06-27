DROP MATERIALIZED VIEW "public"."v_photos_list";--> statement-breakpoint
ALTER TABLE "furniture_items" ADD COLUMN "blurhash" text;--> statement-breakpoint
CREATE MATERIALIZED VIEW "public"."v_photos_list" AS (
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
);