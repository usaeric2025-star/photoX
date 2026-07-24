
import { db, users } from '../index.js';
import { eq } from 'drizzle-orm';

export async function getFirstUser() {
    return await db.query.users.findFirst({
        columns: { id: true }
    });
}

export async function getUserById(id: string) {
    return await db.query.users.findFirst({
        where: eq(users.id, id)
    });
}
