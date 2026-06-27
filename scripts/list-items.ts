import { db } from '../api/_lib/db/index.js';
import { furnitureItems } from '../api/_lib/db/schema.js';
import { limit } from 'drizzle-orm';

async function main() {
    const items = await db.select({ id: furnitureItems.id, imageUrl: furnitureItems.imageUrl })
        .from(furnitureItems)
        .limit(10);
    
    for (const item of items) {
        console.log("ID:", item.id, "URL:", item.imageUrl);
    }
    
    process.exit(0);
}
main();
