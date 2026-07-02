import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './api/_lib/db/schema.ts';

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function main() {
    try {
        await db.insert(schema.furnitureItems)
            .values([{ id: '1e6d6224-6fa2-4c6e-9a3d-bd3f41c3a9a5', groupId: '011ed995-ed66-4e30-8b35-0f0dc5bc31cf' } as any]);
    } catch (e: any) {
        console.log("err.code:", e.code);
        console.log("err.cause.code:", e.cause?.code);
    } finally {
        sql.end();
    }
}
main();
