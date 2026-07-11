
import { db, categories as categoriesTable } from '../index.js';
import { eq, asc } from 'drizzle-orm';

export async function getAllCategories() {
    return await db.select()
        .from(categoriesTable)
        .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.name));
}
