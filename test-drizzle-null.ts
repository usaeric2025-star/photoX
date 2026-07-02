import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgTable, text, uuid, integer } from 'drizzle-orm/pg-core';

const testTable = pgTable('test_table', {
    id: uuid('id').primaryKey(),
    num: integer('num')
});

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql);

async function main() {
    try {
        await db.insert(testTable).values({ id: '1e6d6224-6fa2-4c6e-9a3d-bd3f41c3a9a5', num: "" as any });
    } catch (e) {
        console.log("Empty string param:", e.message);
    }
    
    try {
        await db.insert(testTable).values({ id: 'not-a-uuid', num: null });
    } catch (e) {
        console.log("Null param:", e.message);
    }
    
    sql.end();
}
main();
