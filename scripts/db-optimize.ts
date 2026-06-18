import { db } from '../api/_lib/db/index.js';
import { sql } from 'drizzle-orm';

async function optimize() {
    console.log("Optimizing Database (Adding missing tables / indexes)...");
    
    try {
        // Create maintenance_jobs table if not exists
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS public.maintenance_jobs (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                status text DEFAULT 'pending',
                operation text,
                created_at timestamp DEFAULT now(),
                updated_at timestamp DEFAULT now()
            );
        `);
        console.log("Checked maintenance_jobs table.");

        // Create indexes on furniture_items for list API performance
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_furniture_items_group_id ON furniture_items(group_id);
        `);
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_furniture_items_category_id ON furniture_items(category_id);
        `);
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_furniture_items_is_hidden ON furniture_items(is_hidden);
        `);
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_furniture_items_created_at ON furniture_items(created_at DESC);
        `);
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_furniture_items_pinned_created_id ON furniture_items(is_pinned DESC, created_at DESC, id DESC);
        `);

        // Index on photo_tags
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_photo_tags_photo_id ON photo_tags(photo_id);
        `);
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_photo_tags_tag_id ON photo_tags(tag_id);
        `);

        console.log("Indexes created successfully!");
    } catch (err) {
        console.error("Error optimizing db:", err);
    }
    
    process.exit(0);
}

optimize();
