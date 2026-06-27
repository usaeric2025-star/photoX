import { db } from '../api/_lib/db/index.js';
import { furnitureItems } from '../api/_lib/db/schema.js';
import { notIlike } from 'drizzle-orm';

async function main() {
    const items = await db.select().from(furnitureItems).where(notIlike(furnitureItems.imageUrl, '%.webp'));
    console.log(items.length, "non-webp files remaining");
    if (items.length > 0) {
        console.log(items.map(i => i.imageUrl).slice(0, 10));
    }
    process.exit(0);
}
main();
