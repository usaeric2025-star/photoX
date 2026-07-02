import { db, furnitureItems } from '../api/_lib/db/index.js';
import { isNotNull, eq } from 'drizzle-orm';

async function cleanup() {
    console.log('Fetching rows...');
    const rows = await db.select({
        id: furnitureItems.id,
        name: furnitureItems.name
    })
    .from(furnitureItems)
    .where(isNotNull(furnitureItems.name))
    .limit(20);

    for (const row of rows) {
        console.log(`ID: ${row.id}, Type: ${typeof row.name}, Value: ${JSON.stringify(row.name)}`);
    }
}

cleanup().catch(console.error);
