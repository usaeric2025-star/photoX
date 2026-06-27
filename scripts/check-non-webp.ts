import { db } from '../api/_lib/db/index.js';
import { furnitureItems } from '../api/_lib/db/schema.js';

async function main() {
    const items = await db.select({ id: furnitureItems.id, imageUrl: furnitureItems.imageUrl })
        .from(furnitureItems);
    
    let nonWebpCount = 0;
    for (const item of items) {
        if (item.imageUrl && !item.imageUrl.toLowerCase().includes('.webp')) {
            console.log("Non-WebP URL:", item.imageUrl, "ID:", item.id);
            nonWebpCount++;
        }
    }
    
    console.log("Total non-WebP items found:", nonWebpCount);
    process.exit(0);
}
main();
