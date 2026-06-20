-- 加強版物化視圖索引與快取列優化
CREATE INDEX IF NOT EXISTS idx_v_photos_list_is_hidden ON v_photos_list (is_hidden) WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_v_photos_list_created_at_desc ON v_photos_list (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v_photos_list_is_group_cover ON v_photos_list (is_group_cover) WHERE is_group_cover = true;
CREATE INDEX IF NOT EXISTS idx_v_photos_list_group_id_not_null ON v_photos_list (group_id) WHERE group_id IS NOT NULL;
