import { db, furnitureItems } from '../api/_lib/db/index.js';
import { ilike, or } from 'drizzle-orm';

async function inspect() {
    console.log('Inspecting furnitureItems...');
    const problematic = await db.select({
        id: furnitureItems.id,
        name: furnitureItems.name
    })
    .from(furnitureItems)
    .where(or(ilike(furnitureItems.name, '{%'), ilike(furnitureItems.name, '[%')))
    .limit(5);

    console.log('Found problematic rows:', JSON.stringify(problematic, null, 2));
}

inspect().catch(console.error);
