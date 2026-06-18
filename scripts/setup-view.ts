import { db } from '../api/_lib/db/index.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    console.log('Recreating materialized view v_photos_list flat and complete...');
    
    // Drop existing view first
    await db.execute(sql`DROP MATERIALIZED VIEW IF EXISTS v_photos_list CASCADE;`);
    console.log('Dropped old materialized view v_photos_list');

    // Create the updated flat materialized view
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
    console.log('Materialized view created successfully!');
    
    console.log('Creating unique index on materialized view...');
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_v_photos_list_id ON v_photos_list (id);
    `);
    console.log('Unique index created on materialized view!');

    console.log('Creating filtering indexes on materialized view...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_v_photos_list_group_id ON v_photos_list (group_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_v_photos_list_category_id ON v_photos_list (category_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_v_photos_list_pinned ON v_photos_list (is_pinned) WHERE is_pinned = true;
    `);
    console.log('Filtering indexes created successfully!');
  } catch (err) {
    console.error('Failed to create/recreate view:', err);
  }
  process.exit(0);
}

run();
