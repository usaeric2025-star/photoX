import { db } from '../api/_lib/db/index.js';
import { furnitureItems } from '../api/_lib/db/schema.js';

async function main() {
    const items = await db.select({ id: furnitureItems.id, imageUrl: furnitureItems.imageUrl })
        .from(furnitureItems);
    
    const invalidExtensions = items.filter(i => 
        i.imageUrl && 
        !i.imageUrl.toLowerCase().endsWith('.webp') && 
        !i.imageUrl.toLowerCase().endsWith('.jpg') && 
        !i.imageUrl.toLowerCase().endsWith('.png') &&
        !i.imageUrl.toLowerCase().endsWith('.jpeg')
    );
    
    console.log(items.length, "total items");
    console.log(invalidExtensions.length, "items with invalid extensions");
    
    if (invalidExtensions.length > 0) {
        console.log("Sample invalid image URLs:", invalidExtensions.slice(0, 10));
    }
    process.exit(0);
}
main();
