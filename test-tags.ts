
import { db } from './api/_lib/db/index.js';
import { tags as tagsTable } from './api/_lib/db/schema.js';
import { asc } from 'drizzle-orm';

async function testTags() {
    try {
        const data = await db.select().from(tagsTable).orderBy(asc(tagsTable.name)).limit(5);
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

testTags();
