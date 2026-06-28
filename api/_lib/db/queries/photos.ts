
import { db, furnitureItems, categories, manufacturers, groups, vPhotosList } from '../index.js';
import { eq, and, or, ilike, sql, desc, asc, isNull, count, inArray, type SQL } from 'drizzle-orm';

export interface PhotoListParams {
    page?: number;
    limit?: number;
    cursor?: string | null;
    categoryId?: string | number | null;
    tagId?: string | number | null;
    searchQuery?: string | null;
    isAdminMode?: boolean;
    onlyUngrouped?: boolean;
    onlyGroupsCover?: boolean;
    groupId?: string | null;
    manufacturerId?: string | number | null;
    isHidden?: boolean | null;
    sortOrder?: string | null;
}

export async function getPhotoById(id: string) {
    return await db.query.furnitureItems.findFirst({
        where: eq(furnitureItems.id, id),
        with: {
            category: true,
            manufacturer: true,
            group: true,
            tags: {
                with: {
                    tag: true
                }
            }
        }
    });
}

export async function getPhotosList(params: PhotoListParams) {
    const { 
        limit = 100, cursor,
        categoryId, tagId, searchQuery,
        isAdminMode = false, 
        onlyUngrouped = false, onlyGroupsCover = false,
        groupId, manufacturerId, 
        isHidden, sortOrder
    } = params;

    const whereClauses: (SQL | undefined)[] = [];

    if (cursor) {
        const cursorTime = new Date(cursor);
        if (!isNaN(cursorTime.getTime())) {
            const op = sortOrder === 'oldest' ? sql`>` : sql`<`;
            whereClauses.push(sql`${vPhotosList.createdAt} ${op} ${cursorTime.toISOString()}`);
        }
    }

    const pattern = searchQuery?.trim() ? `%${searchQuery.trim()}%` : null;
    if (pattern) {
        whereClauses.push(or(
            ilike(sql`${vPhotosList.name}->>'zh'`, pattern),
            ilike(sql`${vPhotosList.name}->>'en'`, pattern),
            ilike(sql`${vPhotosList.name}->>'ms'`, pattern),
            ilike(vPhotosList.manualCode, pattern),
            ilike(vPhotosList.modelNumber, pattern),
            ilike(vPhotosList.itemCode, pattern),
            sql`EXISTS (
                SELECT 1 FROM unnest(${vPhotosList.tags}) t
                WHERE t ILIKE ${pattern}
            )`,
            ilike(vPhotosList.categoryNameZh, pattern),
            ilike(vPhotosList.categoryNameEn, pattern),
            ilike(vPhotosList.categoryNameMs, pattern)
        ));
    }

    if (tagId) {
        whereClauses.push(sql`${Number(tagId)} = ANY(${vPhotosList.tagIds})`);
    }

    if (categoryId) {
        whereClauses.push(eq(vPhotosList.categoryId, Number(categoryId)));
    }

    if (groupId) {
        whereClauses.push(eq(vPhotosList.groupId, groupId));
    }
    
    if (onlyGroupsCover) {
        whereClauses.push(or(
            isNull(vPhotosList.groupId),
            eq(vPhotosList.isGroupCover, true)
        ));
    } else if (onlyUngrouped) {
        whereClauses.push(isNull(vPhotosList.groupId));
    }
    
    if (!isAdminMode) {
        whereClauses.push(eq(vPhotosList.isHidden, false));
    } else if (isHidden !== undefined && isHidden !== null) {
        whereClauses.push(eq(vPhotosList.isHidden, isHidden));
    }
    
    if (manufacturerId !== undefined && manufacturerId !== null) {
        whereClauses.push(eq(vPhotosList.manufacturerId, String(manufacturerId)));
    }

    const finalWhere = and(...whereClauses.filter((c): c is SQL => !!c));

    // 1. Get Total Count
    const [countRes] = await db
        .select({ count: count() })
        .from(vPhotosList)
        .where(finalWhere);
    
    const total = Number(countRes.count);

    // 2. Get Data
    const orderSpec = sortOrder === 'oldest' ? asc(vPhotosList.createdAt) : desc(vPhotosList.createdAt);
    const results = await db
        .select()
        .from(vPhotosList)
        .where(finalWhere)
        .orderBy(orderSpec)
        .limit(limit);

    return {
        items: results,
        total,
        nextCursor: results.length === limit ? results[results.length - 1].createdAt : null
    };
}

export async function getGroupCounts(groupIds: string[], includeHidden = false) {
    if (groupIds.length === 0) return new Map<string, number>();

    let conditions: SQL | undefined = inArray(furnitureItems.groupId, groupIds);
    if (!includeHidden) {
        conditions = and(conditions, eq(furnitureItems.isHidden, false));
    }

    const results = await db
        .select({
            groupId: furnitureItems.groupId,
            count: count(furnitureItems.id),
        })
        .from(furnitureItems)
        .where(conditions)
        .groupBy(furnitureItems.groupId);

    const counts = new Map<string, number>();
    for (const res of results) {
        if (res.groupId) {
            counts.set(res.groupId, Number(res.count));
        }
    }
    return counts;
}
