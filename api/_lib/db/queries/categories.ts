
import { db, categories as categoriesTable } from '../index.js';
import { eq, asc } from 'drizzle-orm';

export async function getAllCategories() {
    return await db.select()
        .from(categoriesTable)
        .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.nameZh));
}

export async function getCategoryById(id: number) {
    return await db.query.categories.findFirst({
        where: eq(categoriesTable.id, id)
    });
}
