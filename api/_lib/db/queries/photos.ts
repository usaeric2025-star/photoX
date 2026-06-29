
import { db, furnitureItems, categories, manufacturers, groups, vPhotosList } from '../index.js';
import { eq, and, or, ilike, sql, desc, asc, isNull, count, inArray, type SQL } from 'drizzle-orm';
import { logger } from '../../logger.js';
import { refreshPhotosView } from '../actions.js';

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

    if (tagId && !isNaN(Number(tagId))) {
        whereClauses.push(sql`${Number(tagId)} = ANY(${vPhotosList.tagIds})`);
    }

    if (categoryId && !isNaN(Number(categoryId))) {
        whereClauses.push(eq(vPhotosList.categoryId, Number(categoryId)));
    }

    if (groupId) {
        whereClauses.push(eq(vPhotosList.groupId, groupId));
    }
    
    if (onlyGroupsCover) {
        // 合组视图逻辑：
        // 1. 没有 groupId 的照片（散图）
        // 2. 是组封面的照片
        // 3. 虽有 groupId 但找不到组名的照片（孤儿数据/孤本），也直接显示，防止数据“失踪”
        whereClauses.push(or(
            isNull(vPhotosList.groupId),
            eq(vPhotosList.isGroupCover, true),
            isNull(vPhotosList.groupName)
        ));
    } else if (onlyUngrouped) {
        whereClauses.push(isNull(vPhotosList.groupId));
    }
    
    if (isHidden !== undefined && isHidden !== null) {
        whereClauses.push(eq(vPhotosList.isHidden, isHidden));
    } else if (!isAdminMode) {
        // 只有非管理员模式下才默认隐藏 isHidden=true 的照片
        whereClauses.push(eq(vPhotosList.isHidden, false));
    }
    // 管理员模式下如果不传 isHidden 参数，默认显示全部（包括隐藏的），确保不漏掉任何没删除的数据
    
    if (manufacturerId !== undefined && manufacturerId !== null) {
        whereClauses.push(eq(vPhotosList.manufacturerId, String(manufacturerId)));
    }

    const finalWhere = and(...whereClauses.filter((c): c is SQL => !!c));

    // 1. Get Total Count
    const [countRes] = await db
        .select({ count: count() })
        .from(vPhotosList)
        .where(finalWhere);
    
    let total = Number(countRes.count);

    // 2. Get Data
    const orderSpec = sortOrder === 'oldest' ? asc(vPhotosList.createdAt) : desc(vPhotosList.createdAt);
    const secondaryOrder = sortOrder === 'oldest' ? asc(vPhotosList.id) : desc(vPhotosList.id);

    let results = await db
        .select()
        .from(vPhotosList)
        .where(finalWhere)
        .orderBy(orderSpec, secondaryOrder)
        .limit(limit);

    // Self-healing: If materialized view has 0 rows, but furniture_items actually has records, 
    // it means the view is desynchronized or was never initially populated on a fresh database.
    if (results.length === 0 && !searchQuery && !tagId && !categoryId && !groupId && !manufacturerId) {
        try {
            const [realCountRes] = await db.select({ count: count() }).from(furnitureItems);
            const realCount = Number(realCountRes.count);
            if (realCount > 0) {
                logger.warn(`[Self-Healing] v_photos_list has 0 rows, but furniture_items has ${realCount} rows. Triggering on-demand refresh!`);
                await refreshPhotosView();
                
                // Re-run total count query
                const [newCountRes] = await db
                    .select({ count: count() })
                    .from(vPhotosList)
                    .where(finalWhere);
                total = Number(newCountRes.count);

                // Re-run data query
                results = await db
                    .select()
                    .from(vPhotosList)
                    .where(finalWhere)
                    .orderBy(orderSpec)
                    .limit(limit);
            }
        } catch (healErr) {
            logger.error('[Self-Healing] Failed to refresh materialized view on-demand:', healErr);
        }
    }

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
