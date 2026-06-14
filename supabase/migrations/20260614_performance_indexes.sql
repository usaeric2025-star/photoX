-- [MIGRATION] 20260614_performance_indexes.sql
-- Purpose: Add critical indexes for group-based lookups and visibility filtering to solve performance bottlenecks.

-- 1. Index for group filtering (Critical for Group Detail Page)
CREATE INDEX IF NOT EXISTS idx_furniture_items_group_id ON public.furniture_items(group_id);

-- 2. Index for visibility filtering (Used in almost all public queries)
CREATE INDEX IF NOT EXISTS idx_furniture_items_is_hidden ON public.furniture_items(is_hidden) WHERE is_hidden = false;

-- 3. Composite index for sorted group members (Optimizes reorder calculation and primary photo listing)
CREATE INDEX IF NOT EXISTS idx_furniture_items_group_order ON public.furniture_items(group_id, group_order ASC NULLS LAST);

-- 4. Index for category filtering
CREATE INDEX IF NOT EXISTS idx_furniture_items_category_id ON public.furniture_items(category_id);
