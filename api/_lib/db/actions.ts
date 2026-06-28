import { sql } from 'drizzle-orm';
import { db } from './index.js';
import { logger } from '../logger.js';

export async function ensureViewExists() {
  try {
    // 1. Check if the view exists
    const [viewExists] = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_matviews WHERE matviewname = 'v_photos_list'
      ) as exists;
    `);
    
    if (!viewExists.exists) {
      logger.warn('[View Check] v_photos_list missing, attempting to create...');
      
      await db.execute(sql`
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

        CREATE UNIQUE INDEX IF NOT EXISTS v_photos_list_id_idx ON v_photos_list (id);
      `);
      logger.info('[View Check] v_photos_list created successfully.');
    }

    // 2. Unconditionally ensure the unique index exists on the materialized view to support CONCURRENTLY refreshes
    try {
      await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS v_photos_list_id_idx ON v_photos_list (id);
      `);
    } catch (indexErr) {
      logger.warn('[View Check] Failed to ensure unique index exists on v_photos_list:', indexErr);
    }
  } catch (err) {
    logger.error('[View Check] Failed to check or create view:', err);
  }
}

let isRefreshing = false;
let pendingRefresh: Promise<void> | null = null;

export async function refreshPhotosView() {
  if (isRefreshing && pendingRefresh) {
    logger.info('[View Refresh] Refresh already in progress. Merging into existing refresh execution.');
    return pendingRefresh;
  }

  isRefreshing = true;
  pendingRefresh = (async () => {
    try {
      // Concurrent refresh: non-blocking, requiring unique index on materialized view.
      await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY v_photos_list`);
      logger.info('[View Refresh] Materialized view v_photos_list updated concurrently');
    } catch (err: unknown) {
      logger.error('[View Refresh] Concurrent refresh failed. Skipping simple blocking fallback to prevent database lockups and connection exhaustion:', err);
    } finally {
      isRefreshing = false;
      pendingRefresh = null;
    }
  })();

  return pendingRefresh;
}
