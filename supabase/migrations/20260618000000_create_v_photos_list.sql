-- 1. 建立物化視圖
CREATE MATERIALIZED VIEW IF NOT EXISTS v_photos_list AS
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

-- 2. 建立唯一索引（支援 CONCURRENTLY 首要條件）
CREATE UNIQUE INDEX IF NOT EXISTS idx_v_photos_list_id ON v_photos_list (id);

-- 3. 建立篩選索引
CREATE INDEX IF NOT EXISTS idx_v_photos_list_group_id ON v_photos_list (group_id);
CREATE INDEX IF NOT EXISTS idx_v_photos_list_category_id ON v_photos_list (category_id);
CREATE INDEX IF NOT EXISTS idx_v_photos_list_pinned ON v_photos_list (is_pinned) WHERE is_pinned = true;

-- 注意：PostgreSQL 限制 REFRESH MATERIALIZED VIEW (CONCURRENTLY) 不能在 Transaction Block 內執行，
-- 因此不能透過 Trigger 在 INSERT/UPDATE 後同步執行。
-- 目前依賴 API 應用層在背景 (Background Promise) 呼叫 DB 執行 REFRESH。
