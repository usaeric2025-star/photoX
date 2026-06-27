import { db } from '../api/_lib/db/index.js';
import { furnitureItems } from '../api/_lib/db/schema.js';
import { like } from 'drizzle-orm';

async function main() {
    const items = await db.select().from(furnitureItems);
    const cabinetItems = items.filter(item => {
        const name = item.name as any;
        const nameStr = typeof name === 'string' ? name : (name?.zh || name?.en || "");
        return nameStr.includes('Storage Cabinet');
    });
    
    console.log(JSON.stringify(cabinetItems, null, 2));
    process.exit(0);
}
main();
