import { sql } from 'drizzle-orm';
import { db } from '../api/_lib/db/index.js';

async function main() {
    console.log("=== Removing base64 images from furniture_items ===");
    try {
        await db.execute(sql`
            UPDATE furniture_items 
            SET image_url = 'https://placeholder.com/placeholder.png'
            WHERE image_url LIKE 'data:image/%';
        `);
        console.log("✅ Successfully removed base64 images.");

        console.log("=== Adding constraint to image_url ===");
        try {
            await db.execute(sql`
                ALTER TABLE furniture_items 
                ADD CONSTRAINT check_image_url_is_url 
                CHECK (image_url IS NULL OR image_url NOT LIKE 'data:image/%');
            `);
            console.log("✅ Added constraint check_image_url_is_url.");
        } catch (e: any) {
            console.log("⚠️ Constraint might already exist:", e.message);
        }

        console.log("=== Updating GIN index for search length ===");
        try {
            await db.execute(sql`
                DROP INDEX IF EXISTS idx_furniture_items_name_multilang;
                CREATE INDEX idx_furniture_items_name_multilang 
                ON furniture_items USING GIN (
                  to_tsvector('simple', 
                    COALESCE(substring(name->>'zh', 1, 100), '') || ' ' || 
                    COALESCE(substring(name->>'en', 1, 100), '') || ' ' || 
                    COALESCE(substring(name->>'ms', 1, 100), '')
                  )
                );
            `);
            console.log("✅ Updated index idx_furniture_items_name_multilang.");
        } catch (e: any) {
            console.log("⚠️ Failed to update index:", e.message);
        }

    } catch (e) {
        console.error("❌ Error running fix:", e);
    }
    process.exit(0);
}

main();
