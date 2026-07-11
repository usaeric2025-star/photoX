
import { db, categories as categoriesTable, tags as tagsTable } from './api/_lib/db/index.js';
import { eq, sql } from 'drizzle-orm';

async function checkAndMerge() {
    console.log('--- CATEGORIES ---');
    const catColsResult = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'categories' 
        AND column_name IN ('name_zh', 'name_en', 'name_ms')
    `);
    const catCols = (catColsResult as any).map((c: any) => c.column_name);
    console.log('Found legacy category columns:', catCols);

    const categories = await db.execute(sql`SELECT * FROM categories`);
    for (const item of categories as any[]) {
        const desc = (item.description as any) || {};
        const newDesc = { ...desc };
        if (item.name_zh && !newDesc.zh) newDesc.zh = item.name_zh;
        if (item.name_en && !newDesc.en) newDesc.en = item.name_en;
        if (item.name_ms && !newDesc.ms) newDesc.ms = item.name_ms;
        if (!newDesc.zh && item.name) newDesc.zh = item.name;
        if (!newDesc.en) newDesc.en = newDesc.zh;
        if (!newDesc.ms) newDesc.ms = newDesc.zh;
        await db.update(categoriesTable).set({ description: newDesc }).where(eq(categoriesTable.id, item.id));
    }

    console.log('--- TAGS ---');
    const tagColsResult = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tags' 
        AND column_name IN ('name_zh', 'name_en', 'name_ms')
    `);
    const tagCols = (tagColsResult as any).map((c: any) => c.column_name);
    console.log('Found legacy tag columns:', tagCols);

    const tags = await db.execute(sql`SELECT * FROM tags`);
    for (const item of tags as any[]) {
        const desc = (item.description as any) || {};
        const newDesc = { ...desc };
        if (item.name_zh && !newDesc.zh) newDesc.zh = item.name_zh;
        if (item.name_en && !newDesc.en) newDesc.en = item.name_en;
        if (item.name_ms && !newDesc.ms) newDesc.ms = item.name_ms;
        if (!newDesc.zh && item.name) newDesc.zh = item.name;
        if (!newDesc.en) newDesc.en = newDesc.zh;
        if (!newDesc.ms) newDesc.ms = newDesc.zh;
        await db.update(tagsTable).set({ description: newDesc }).where(eq(tagsTable.id, item.id));
    }

    console.log('Merge complete.');
    process.exit(0);
}

checkAndMerge().catch(err => {
    console.error(err);
    process.exit(1);
});
