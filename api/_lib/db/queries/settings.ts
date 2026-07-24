
import { db, settings as settingsTable, secrets as secretsTable } from '../index.js';
import { eq, inArray } from 'drizzle-orm';

export async function getGlobalSettings() {
    const [settingsRes] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1)).limit(1);
    return settingsRes || null;
}

export async function getAllSecrets() {
    return await db.select().from(secretsTable);
}

export async function getSecretsByKeys(keys: string[]) {
    return await db.select()
        .from(secretsTable)
        .where(inArray(secretsTable.key, keys));
}

export async function upsertSecret(key: string, value: string) {
    return await db.insert(secretsTable).values({ 
        key, 
        value,
        updatedAt: new Date()
    }).onConflictDoUpdate({
        target: secretsTable.key,
        set: { 
            value,
            updatedAt: new Date()
        }
    });
}

export async function upsertSettings(id: number, updates: Partial<typeof settingsTable.$inferInsert>) {
    const { id: _, ...updatePayload } = updates;
    return await db.insert(settingsTable)
        .values({ ...updates, id } as typeof settingsTable.$inferInsert)
        .onConflictDoUpdate({
            target: settingsTable.id,
            set: { ...updatePayload, updatedAt: new Date() }
        });
}
