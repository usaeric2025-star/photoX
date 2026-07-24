import { db, manufacturers as manufacturersTable, furnitureItems } from '../index.js';
import { eq, asc } from 'drizzle-orm';

export async function getManufacturerById(id: string) {
    return await db.query.manufacturers.findFirst({
        where: eq(manufacturersTable.id, id)
    });
}

export async function getAllManufacturers() {
    return await db.select().from(manufacturersTable).orderBy(asc(manufacturersTable.name));
}

export async function createManufacturer(data: typeof manufacturersTable.$inferInsert) {
    const [result] = await db.insert(manufacturersTable).values(data).returning();
    return result;
}

export async function updateManufacturer(id: string, updates: Partial<typeof manufacturersTable.$inferInsert>) {
    return await db.update(manufacturersTable).set(updates).where(eq(manufacturersTable.id, id));
}

export async function deleteManufacturer(id: string) {
    return await db.delete(manufacturersTable).where(eq(manufacturersTable.id, id));
}

export async function clearPhotosFromManufacturer(manufacturerId: string) {
    return await db
        .update(furnitureItems)
        .set({ manufacturerId: null })
        .where(eq(furnitureItems.manufacturerId, manufacturerId))
        .returning({ id: furnitureItems.id });
}
