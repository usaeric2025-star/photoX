import { db } from '../api/_lib/db/index.js';
import { furnitureItems } from '../api/_lib/db/schema.js';
import { inArray, isNotNull } from 'drizzle-orm';

async function main() {
    const items = await db.select({ 
        id: furnitureItems.id, 
        imageHash: furnitureItems.imageHash, 
        imageUrl: furnitureItems.imageUrl,
        createdAt: furnitureItems.createdAt
    })
        .from(furnitureItems)
        .where(isNotNull(furnitureItems.imageHash));
    
    const hashGroups = new Map<string, typeof items>();
    for (const item of items) {
        if (!item.imageHash) continue;
        if (!hashGroups.has(item.imageHash)) {
            hashGroups.set(item.imageHash, []);
        }
        hashGroups.get(item.imageHash)!.push(item);
    }
    
    const idsToDelete: string[] = [];
    
    for (const [hash, group] of hashGroups) {
        if (group.length > 1) {
            console.log("Found duplicate hash:", hash);
            // Sort by createdAt descending to keep the latest
            group.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
            
            const toDelete = group.slice(1);
            console.log("Deleting:", toDelete.map(i => i.id));
            idsToDelete.push(...toDelete.map(i => i.id));
        }
    }
    
    if (idsToDelete.length > 0) {
        await db.delete(furnitureItems).where(inArray(furnitureItems.id, idsToDelete));
        console.log("Deleted", idsToDelete.length, "items.");
    } else {
        console.log("No duplicates to delete.");
    }
    process.exit(0);
}
main();