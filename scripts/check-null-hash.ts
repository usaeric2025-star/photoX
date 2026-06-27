import { db } from '../api/_lib/db/index.js';
import { furnitureItems } from '../api/_lib/db/schema.js';
import { isNull } from 'drizzle-orm';

async function main() {
    const items = await db.select({ id: furnitureItems.id })
        .from(furnitureItems)
        .where(isNull(furnitureItems.imageHash));
    
    console.log("Count of null imageHash:", items.length);
    process.exit(0);
}
main();
