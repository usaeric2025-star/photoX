import { db, furnitureItems } from '../api/_lib/db/index.js';

async function inspect() {
    console.log('Inspecting furnitureItems...');
    const problematic = await db.select({
        id: furnitureItems.id,
        name: furnitureItems.name
    })
    .from(furnitureItems)
    .limit(5);

    console.log('Found rows:', JSON.stringify(problematic, null, 2));
}

inspect().catch(console.error);
