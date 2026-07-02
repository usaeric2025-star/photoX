import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './api/_lib/db/schema.ts';

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function main() {
    try {
        const payload = {
            id: '1e6d6224-6fa2-4c6e-9a3d-bd3f41c3a9a5',
            userId: '8ec53131-a589-4b50-beb4-6b5308541e1b',
            name: '1000096874',
            description: null,
            categoryId: null,
            manufacturerId: null,
            groupId: '011ed995-ed66-4e30-8b35-0f0dc5bc31cf',
            isGroupCover: false,
            isPinned: false,
            isHidden: false,
            imageUrl: 'https://placeholder.com/placeholder.png',
            imageHash: 'c49a78e5aea1fcd9ccf6d45cb43011ac46e8a4da19a1ade1b5bf608fe88f5ca7',
            itemCode: 'X-Q9YUBDSQ',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        await db.insert(schema.furnitureItems)
            .values([payload as any])
            .onConflictDoUpdate({
                target: schema.furnitureItems.id,
                set: payload as any
            });
            
        console.log("Success!");
    } catch (e: any) {
        console.log("Error code:", e.cause?.code);
        console.log("Error detail:", e.cause?.detail);
        console.log("Error message:", e.cause?.message);
    } finally {
        sql.end();
    }
}
main();
