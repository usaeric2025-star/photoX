
import { db, categories as categoriesTable, furnitureItems } from '../index.js';
import { eq, asc, sql } from 'drizzle-orm';

export async function getCategoryById(id: number) {
    return await db.query.categories.findFirst({
        where: eq(categoriesTable.id, id)
    });
}
export async function getAllCategories() {
    return await db.select()
        .from(categoriesTable)
        .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.name));
}

export async function createCategory(data: typeof categoriesTable.$inferInsert) {
    const [result] = await db.insert(categoriesTable).values(data).returning();
    return result;
}

export async function updateCategory(id: number, updates: Partial<typeof categoriesTable.$inferInsert>) {
    return await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id));
}

export async function deleteCategory(id: number) {
    return await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
}

export async function clearPhotosFromCategory(categoryId: number) {
    return await db
        .update(furnitureItems)
        .set({ categoryId: null })
        .where(eq(furnitureItems.categoryId, categoryId))
        .returning({ id: furnitureItems.id });
}

export async function seedCategories(data: (typeof categoriesTable.$inferInsert)[]) {
    await db.delete(categoriesTable).where(sql`true`);
    return await db.insert(categoriesTable).values(data);
}
