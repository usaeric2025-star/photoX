
import { db, furnitureItems, groups as groupsTable, tags as tagsTable, categories } from '../index.js';
import { eq, count } from 'drizzle-orm';
import { logger } from '../../logger.js';

export async function getGlobalStats() {
    try {
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
            totalPhotos: Number(photoCount?.count ?? 0),
            hiddenPhotos: Number(hiddenCount?.count ?? 0),
            totalGroups: Number(groupCount?.count ?? 0),
            totalTags: Number(tagCount?.count ?? 0),
            totalCategories: Number(categoryCount?.count ?? 0)
        };
    } catch (err) {
        logger.error('[getGlobalStats] Failed to fetch stats from DB:', err);
        return {
            totalPhotos: 0,
            hiddenPhotos: 0,
            totalGroups: 0,
            totalTags: 0,
            totalCategories: 0
        };
    }
}
