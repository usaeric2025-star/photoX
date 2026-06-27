import { db } from '../api/_lib/db/index.js';
import { furnitureItems } from '../api/_lib/db/schema.js';

async function main() {
    const items = await db.select({ id: furnitureItems.id, imageUrl: furnitureItems.imageUrl })
        .from(furnitureItems);
    
    const urlGroups = new Map<string, typeof items>();
    for (const item of items) {
        if (!item.imageUrl) continue;
        if (!urlGroups.has(item.imageUrl)) {
            urlGroups.set(item.imageUrl, []);
        }
        urlGroups.get(item.imageUrl)!.push(item);
    }
    
    for (const [url, group] of urlGroups) {
        if (group.length > 1) {
            console.log("Found duplicate URL:", url);
            console.log("Count:", group.length);
            console.log("IDs:", group.map(i => i.id));
        }
    }
    process.exit(0);
}
main();
