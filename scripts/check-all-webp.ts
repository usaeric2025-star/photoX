import { db } from '../api/_lib/db/index.js';
import { furnitureItems } from '../api/_lib/db/schema.js';

async function main() {
    const items = await db.select({ id: furnitureItems.id, imageUrl: furnitureItems.imageUrl })
        .from(furnitureItems);
    
    let count = 0;
    for (const item of items) {
        if (item.imageUrl && !item.imageUrl.toLowerCase().endsWith('.webp')) {
            console.log("Found:", item.imageUrl);
            count++;
        }
    }
    
    console.log("Total non-webp:", count);
    process.exit(0);
}
main();
