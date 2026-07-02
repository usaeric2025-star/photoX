import { db, furnitureItems } from '../api/_lib/db/index.js';
import { ilike, or, and, isNotNull } from 'drizzle-orm';

async function cleanup() {
    console.log('Fetching problematic rows...');
    const problematic = await db.select({
        id: furnitureItems.id,
        name: furnitureItems.name
    })
    .from(furnitureItems)
    .where(and(
        isNotNull(furnitureItems.name),
        or(ilike(furnitureItems.name, '{%'), ilike(furnitureItems.name, '[%'))
    ))
    .limit(10);

    for (const row of problematic) {
        try {
            const parsed = JSON.parse(row.name!);
            const newName = typeof parsed === 'object' ? (parsed.en || parsed.zh || '') : parsed;
            console.log(`ID: ${row.id}, Old: ${row.name}, New: ${newName}`);
        } catch (e) {
            console.log(`ID: ${row.id}, Could not parse: ${row.name}`);
        }
    }
}

cleanup().catch(console.error);
