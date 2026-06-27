import { db } from '../api/_lib/db/index.js';
import { furnitureItems } from '../api/_lib/db/schema.js';
import { desc } from 'drizzle-orm';

async function main() {
    const items = await db.select({ id: furnitureItems.id, imageUrl: furnitureItems.imageUrl, imageHash: furnitureItems.imageHash })
        .from(furnitureItems)
        .orderBy(desc(furnitureItems.createdAt))
        .limit(5);
    
    for (const item of items) {
        console.log("ID:", item.id, "URL:", item.imageUrl, "Hash:", item.imageHash);
    }
    
    process.exit(0);
}
main();
