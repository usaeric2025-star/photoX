import { sql } from 'drizzle-orm';
import { db } from './index.js';
import { logger } from '../logger.js';

export async function ensureViewExists() {
  try {
    // Check if the standard view 'v_photos_list' already exists in pg_views
    const [row] = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_views WHERE viewname = 'v_photos_list'
      ) as exists;
    `);

    if (row && row.exists) {
      // Standard view already exists! Zero action needed, 100% safe.
      return;
    }

    logger.warn('[View Check] v_photos_list standard view does not exist. Creating it...');

    // 1. First ensure any legacy materialized view is removed (one-time migration check)
    try {
      await db.execute(sql`DROP MATERIALIZED VIEW IF EXISTS v_photos_list CASCADE;`);
    } catch (dropErr) {
      // Ignore if already dropped or lock issues, but try our best
    }

    // 2. Create the standard, fully dynamic, non-blocking standard VIEW
    await db.execute(sql`
      CREATE OR REPLACE VIEW v_photos_list AS
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
    logger.info('[View Check] v_photos_list dynamic view created successfully.');
  } catch (err) {
    logger.error('[View Check] Failed to ensure view exists:', err);
  }
}

export async function refreshPhotosView() {
  // Dynamic standard views are always up-to-date automatically in real-time.
  // There is no need to run expensive REFRESH command or acquire locks!
  logger.info('[View Refresh] Standard view is fully dynamic. Skipped refresh.');
}
