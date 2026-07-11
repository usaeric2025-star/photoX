
import { db, furnitureItems, categories, manufacturers, groups as groupsTable, tags as tagsTable, photoTags } from '../index.js';
import { eq, and, or, ilike, sql, desc, asc, isNull, count, inArray, type SQL } from 'drizzle-orm';
import { logger } from '../../logger.js';
import { normalizeI18n } from '../../../../shared/i18n.js';

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

async function getPhotoById(id: string) {
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

// Simple memory cache for counts to avoid redundant heavy queries
const countCache = new Map<string, { count: number, timestamp: number }>();

export function clearCountCache() {
    countCache.clear();
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

    // ... (rest of the logic for whereClauses remains same)
    if (cursor) {
        const cursorTime = new Date(cursor);
        if (!isNaN(cursorTime.getTime())) {
            const op = sortOrder === 'oldest' ? sql`>` : sql`<`;
            whereClauses.push(sql`${furnitureItems.createdAt} ${op} ${cursorTime.toISOString()}`);
        }
    }

    const pattern = searchQuery?.trim() ? `%${searchQuery.trim()}%` : null;
    if (pattern) {
        whereClauses.push(or(
            ilike(furnitureItems.name, pattern),
            ilike(furnitureItems.manualCode, pattern),
            ilike(furnitureItems.modelNumber, pattern),
            ilike(furnitureItems.itemCode, pattern),
            sql`EXISTS (
                SELECT 1 FROM ${photoTags} pt
                JOIN ${tagsTable} t ON pt.tag_id = t.id
                WHERE pt.photo_id = ${furnitureItems.id} AND t.name ILIKE ${pattern}
            )`,
            sql`EXISTS (
                SELECT 1 FROM ${categories} c
                WHERE c.id = ${furnitureItems.categoryId} AND c.name ILIKE ${pattern}
            )`
        ));
    }

    if (tagId && !isNaN(Number(tagId))) {
        whereClauses.push(sql`EXISTS (
            SELECT 1 FROM ${photoTags} pt
            WHERE pt.photo_id = ${furnitureItems.id} AND pt.tag_id = ${Number(tagId)}
        )`);
    }

    if (categoryId && !isNaN(Number(categoryId))) {
        whereClauses.push(eq(furnitureItems.categoryId, Number(categoryId)));
    }

    if (groupId) {
        whereClauses.push(eq(furnitureItems.groupId, groupId));
    }
    
    if (onlyGroupsCover) {
        whereClauses.push(or(
            isNull(furnitureItems.groupId),
            eq(furnitureItems.isGroupCover, true),
            sql`NOT EXISTS (SELECT 1 FROM ${groupsTable} g WHERE g.id = ${furnitureItems.groupId})`
        ));
    } else if (onlyUngrouped) {
        whereClauses.push(isNull(furnitureItems.groupId));
    }
    
    if (isHidden !== undefined && isHidden !== null) {
        whereClauses.push(eq(furnitureItems.isHidden, isHidden));
    } else if (!isAdminMode) {
        whereClauses.push(or(eq(furnitureItems.isHidden, false), isNull(furnitureItems.isHidden)));
    }
    
    if (manufacturerId !== undefined && manufacturerId !== null) {
        const mId = String(manufacturerId).trim();
        if (mId !== '' && mId.toLowerCase() !== 'null' && mId.toLowerCase() !== 'undefined' && mId.toLowerCase() !== 'uncategorized') {
            whereClauses.push(eq(furnitureItems.manufacturerId, mId));
        }
    }

    const finalWhere = and(...whereClauses.filter((c): c is SQL => !!c));

    // 1. Smarter Count with Cache
    const cacheKey = JSON.stringify({ categoryId, tagId, searchQuery, isAdminMode, onlyUngrouped, onlyGroupsCover, groupId, isHidden });
    const cached = countCache.get(cacheKey);
    let totalPromise: Promise<number>;

    if (cached && Date.now() - cached.timestamp < 60000) {
        totalPromise = Promise.resolve(cached.count);
    } else {
        totalPromise = db.select({ count: count() })
            .from(furnitureItems)
            .where(finalWhere)
            .execute()
            .then(res => {
                const cnt = Number(res[0]?.count || 0);
                countCache.set(cacheKey, { count: cnt, timestamp: Date.now() });
                return cnt;
            })
            .catch(e => {
                logger.warn('Count query failed or timed out, using fallback total=0', e);
                return cached?.count || 0;
            });
    }

    // 2. Data Fetch
    // isHidden should default to the very end of the list (false/null first, true last)
    const hiddenOrder = sql`case when ${furnitureItems.isHidden} = true then 1 else 0 end asc`;
    // isPinned should be at the very top (true first, false/null last)
    const pinnedOrder = sql`case when ${furnitureItems.isPinned} = true then 0 else 1 end asc`;
    const primaryOrder = sortOrder === 'oldest' ? asc(furnitureItems.createdAt) : desc(furnitureItems.createdAt);
    const secondaryOrder = sortOrder === 'oldest' ? asc(furnitureItems.id) : desc(furnitureItems.id);

    const orderByList: SQL[] = [hiddenOrder];
    if (groupId) {
        orderByList.push(desc(furnitureItems.isGroupCover));
    }
    orderByList.push(pinnedOrder, primaryOrder, secondaryOrder);

    const dbDataPromise = db
        .select({
            items: furnitureItems,
            group: groupsTable,
            category: categories,
        })
        .from(furnitureItems)
        .leftJoin(groupsTable, eq(furnitureItems.groupId, groupsTable.id))
        .leftJoin(categories, eq(furnitureItems.categoryId, categories.id))
        .where(finalWhere)
        .orderBy(...orderByList)
        .limit(limit)
        .execute();

    // Run queries in parallel
    const [total, dbData] = await Promise.all([totalPromise, dbDataPromise]);
    
    // Fetch tags in bulk
    const photoIds = dbData.map(d => d.items.id);
    const tagsByPhoto = new Map<string, { tagId: number | null; tags: { id: number | null; name: string | null } }[]>();
    
    if (photoIds.length > 0) {
        try {
            const tagsData = await db.select({
                photoId: photoTags.photoId,
                tagId: photoTags.tagId,
                name: tagsTable.name
            })
            .from(photoTags)
            .innerJoin(tagsTable, eq(photoTags.tagId, tagsTable.id))
            .where(inArray(photoTags.photoId, photoIds));

            for (const t of tagsData) {
                const list = tagsByPhoto.get(t.photoId ?? '') || [];
                list.push({ tagId: t.tagId, tags: { id: t.tagId, name: t.name } });
                tagsByPhoto.set(t.photoId ?? '', list);
            }
        } catch (e) {
            logger.error('Error fetching tags in bulk', e);
        }
    }

    // Format to match expected frontend structure
    const results = dbData.map(d => {
        try {
            const item = { ...d.items } as Record<string, unknown>;
            item.name = d.items.name;
            item.description = d.items.description;
            item.groupName = d.group?.name || null;
            item.groupCoverPhotoId = d.group?.coverPhotoId || null;
            item.categoryName = (d.category?.description as any)?.zh || d.category?.name || null;
            item.categoryDescription = d.category?.description || null;
            
            const pTags = tagsByPhoto.get(d.items.id) || [];
            item.tags = pTags.map(pt => pt.tags.name);
            item.tagIds = pTags.map(pt => pt.tags.id);
            
            return item;
        } catch (e) {
            logger.error('Error formatting photo item', { photoId: d.items.id, error: e });
            return null;
        }
    }).filter((i): i is Record<string, unknown> => i !== null);

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
