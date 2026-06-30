
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
            whereClauses.push(sql`${furnitureItems.createdAt} ${op} ${cursorTime.toISOString()}`);
        }
    }

    const pattern = searchQuery?.trim() ? `%${searchQuery.trim()}%` : null;
    if (pattern) {
        whereClauses.push(or(
            ilike(sql`${furnitureItems.name}->>'zh'`, pattern),
            ilike(sql`${furnitureItems.name}->>'en'`, pattern),
            ilike(sql`${furnitureItems.name}->>'ms'`, pattern),
            ilike(furnitureItems.manualCode, pattern),
            ilike(furnitureItems.modelNumber, pattern),
            ilike(furnitureItems.itemCode, pattern),
            // Tags Subquery
            sql`EXISTS (
                SELECT 1 FROM ${photoTags} pt
                JOIN ${tagsTable} t ON pt.tag_id = t.id
                WHERE pt.photo_id = ${furnitureItems.id} AND t.name ILIKE ${pattern}
            )`,
            // Category Subquery
            sql`EXISTS (
                SELECT 1 FROM ${categories} c
                WHERE c.id = ${furnitureItems.categoryId} AND (
                    c.name_zh ILIKE ${pattern} OR 
                    c.name_en ILIKE ${pattern} OR 
                    c.name_ms ILIKE ${pattern}
                )
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
        // 合组视图逻辑：散图、组封面、孤儿数据
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
        whereClauses.push(eq(furnitureItems.isHidden, false));
    }
    
    if (manufacturerId !== undefined && manufacturerId !== null) {
        whereClauses.push(eq(furnitureItems.manufacturerId, String(manufacturerId)));
    }

    const finalWhere = and(...whereClauses.filter((c): c is SQL => !!c));

    // 1. Get Total Count
    const [countRes] = await db
        .select({ count: count() })
        .from(furnitureItems)
        .where(finalWhere);
    
    let total = Number(countRes.count);

    // 2. Get Data
    const orderSpec = sortOrder === 'oldest' ? asc(furnitureItems.createdAt) : desc(furnitureItems.createdAt);
    const secondaryOrder = sortOrder === 'oldest' ? asc(furnitureItems.id) : desc(furnitureItems.id);

    let dbData = await db
        .select({
            items: furnitureItems,
            group: groupsTable,
            category: categories,
        })
        .from(furnitureItems)
        .leftJoin(groupsTable, eq(furnitureItems.groupId, groupsTable.id))
        .leftJoin(categories, eq(furnitureItems.categoryId, categories.id))
        .where(finalWhere)
        .orderBy(orderSpec, secondaryOrder)
        .limit(limit);
    
    // Fetch tags in bulk
    const photoIds = dbData.map(d => d.items.id);
    const tagsByPhoto = new Map<string, any[]>();
    
    if (photoIds.length > 0) {
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
    }

    // Format to match expected frontend structure
    const results = dbData.map(d => {
        try {
            const item = { ...d.items } as Record<string, unknown>;
            item.name = normalizeI18n(d.items.name).zh;
            item.description = normalizeI18n(d.items.description).zh;
            item.groupName = d.group?.name || null;
            item.groupCoverPhotoId = d.group?.coverPhotoId || null;
            item.categoryNameZh = d.category?.nameZh || null;
            item.categoryNameEn = d.category?.nameEn || null;
            item.categoryNameMs = d.category?.nameMs || null;
            
            const pTags = tagsByPhoto.get(d.items.id) || [];
            item.tags = pTags.map((pt: any) => pt.tags.name);
            item.tagIds = pTags.map((pt: any) => pt.tags.id);
            
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
