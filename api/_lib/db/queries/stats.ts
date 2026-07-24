
import { db, furnitureItems, groups as groupsTable, tags as tagsTable, categories } from '../index.js';
import { eq, count } from 'drizzle-orm';

export async function getGlobalStats() {
    const [
        [photoCount],
        [hiddenCount],
        [groupCount],
        [tagCount],
        [categoryCount]
    ] = await Promise.all([
        db.select({ count: count() }).from(furnitureItems),
        db.select({ count: count() }).from(furnitureItems).where(eq(furnitureItems.isHidden, true)),
        db.select({ count: count() }).from(groupsTable),
        db.select({ count: count() }).from(tagsTable),
        db.select({ count: count() }).from(categories)
    ]);

    return {
        totalPhotos: Number(photoCount.count),
        hiddenPhotos: Number(hiddenCount.count),
        totalGroups: Number(groupCount.count),
        totalTags: Number(tagCount.count),
        totalCategories: Number(categoryCount.count)
    };
}
