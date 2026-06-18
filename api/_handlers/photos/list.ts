import { Hono } from 'hono';
import { type } from 'arktype';
import { db, furnitureItems, groups as groupsTable, tags as tagsTable, photoTags, categories, vPhotosList } from '../../_lib/db/index.js';
import { eq, ne, and, or, ilike, sql, asc, desc, inArray, isNull, count, exists, type SQL } from 'drizzle-orm';
import { PhotoListReqSchema, ListByGroupReqSchema, PhotoListItem, PhotoListItemSchema } from '../../_shared/apiContractSchema.js';
import { errorFactory } from '../../_lib/error/AppError.js';
import { normalizeI18n } from '../../_shared/i18n.js';

async function getGroupCounts(groupIds: string[], includeHidden = false) {
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

export const listHandler = (app: Hono) => {
  app.post('/list', async (c) => {
    const body = await c.req.json();
    const check = PhotoListReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { 
      page = 0, limit = 100, cursor,
      categoryId, tagId, searchQuery,
      isAdminMode = false, 
      onlyUngrouped = false, onlyGroupsCover = false,
      groupId, manufacturerId, 
      isHidden,
      sortOrder
    } = check;
    
    try {
      const hasTag = tagId !== undefined && tagId !== null && tagId !== '';
      const hasCat = categoryId !== undefined && categoryId !== null && categoryId !== '';

      const whereClauses: (SQL | undefined)[] = [];

      if (cursor) {
        const cursorTime = new Date(cursor as string);
        if (!isNaN(cursorTime.getTime())) {
          whereClauses.push(sql`${vPhotosList.createdAt} < ${cursorTime.toISOString()}`);
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

      if (hasTag) {
        whereClauses.push(sql`${tagId} = ANY(${vPhotosList.tagIds})`);
      }

      if (hasCat) {
          whereClauses.push(eq(vPhotosList.categoryId, categoryId as any));
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
        whereClauses.push(eq(vPhotosList.manufacturerId, manufacturerId as any));
      }

      const finalWhere = and(...whereClauses.filter((c): c is SQL => !!c));

      // 1. Get Total Count
      const [countRes] = await db
        .select({ count: count() })
        .from(vPhotosList)
        .where(finalWhere);
      
      const total = Number(countRes.count);

      // 2. Get Paginated Data
      const builder = db
        .select()
        .from(vPhotosList);

      if (finalWhere) builder.where(finalWhere);

      // Ordering
      const orderClauses: SQL[] = [desc(vPhotosList.isPinned)];
      // Cursor pagination is most reliable with a single temporal order
      if (sortOrder === 'newest' || !sortOrder) orderClauses.push(desc(vPhotosList.createdAt), desc(vPhotosList.id));
      else if (sortOrder === 'oldest') orderClauses.push(asc(vPhotosList.createdAt), asc(vPhotosList.id));
      else if (sortOrder === 'name') orderClauses.push(asc(sql`${vPhotosList.name}->>'zh'`), asc(vPhotosList.id));
      else orderClauses.push(desc(vPhotosList.createdAt), desc(vPhotosList.id));

      builder.orderBy(...orderClauses);
      
      // Pagination
      if (cursor) {
        builder.limit(limit);
      } else {
        builder.limit(limit).offset(page * limit);
      }

      const data = await builder;

      // Group counts and formatting
      if (data.length > 0) {
        const gIds = Array.from(new Set(data.filter(d => d.groupId).map(d => d.groupId))) as string[];
        const counts = await getGroupCounts(gIds, isAdminMode);

        const formatted = data.map(d => {
            const nameObj = normalizeI18n(d.name);
            const descObj = normalizeI18n(d.description);
            
            const displayName = nameObj.zh || nameObj.en || nameObj.ms || 'Unnamed';
            const displayDesc = descObj.zh || descObj.en || descObj.ms || '';

            return {
                id: d.id,
                name: d.manualCode || displayName,
                description: displayDesc,
                imageUrl: d.imageUrl || '',
                thumbnailUrl: d.imageUrl || '', // Fallback to original image, managed by resizer worker
                groupId: d.groupId || null,
                groupName: d.groupName || null,
                memberCount: d.groupId ? (counts.get(d.groupId) || 0) : 0,
                tags: d.tags || [],
                isPinned: !!d.isPinned,
                isHidden: !!d.isHidden,
                isCover: !!d.isGroupCover || (d.groupCoverPhotoId === d.id),
                createdAt: d.createdAt ? d.createdAt.toISOString() : null,
            } as any;
        });

        // ✅ 契約驗證
        const nextCursor = formatted.length > 0 ? formatted[formatted.length - 1].createdAt : null;
        return c.json({ 
          success: true, 
          data: PhotoListItemSchema.array().assert(formatted),
          nextCursor,
          total
        });
      }

      return c.json({ success: true, data: [], nextCursor: null, total: 0 });
    } catch (error: unknown) {
      throw errorFactory.wrap(error, 'photos.list', 'QUERY_FAILURE');
    }
  });

  app.post('/list-by-group', async (c) => {
    const body = await c.req.json();
    const check = ListByGroupReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);
    
    const { groupId, isAdminMode = false } = check;
    try {
        const query = db
            .select({
                items: furnitureItems,
                group: groupsTable
            })
            .from(furnitureItems)
            .leftJoin(groupsTable, eq(furnitureItems.groupId, groupsTable.id))
            .where(and(
                eq(furnitureItems.groupId, groupId),
                !isAdminMode ? eq(furnitureItems.isHidden, false) : undefined
            ))
            .orderBy(
                desc(furnitureItems.isGroupCover),
                asc(furnitureItems.isHidden),
                desc(furnitureItems.createdAt),
                asc(furnitureItems.id)
            );

        const data = await query;
        if (data.length > 0) {
            const photoIds = data.map(d => d.items.id);
            const counts = await getGroupCounts([groupId], isAdminMode);
            const tagsData = await db.select({
                photoId: photoTags.photoId,
                tagId: photoTags.tagId,
                name: tagsTable.name
            })
            .from(photoTags)
            .innerJoin(tagsTable, eq(photoTags.tagId, tagsTable.id))
            .where(inArray(photoTags.photoId, photoIds));

            const tagsByPhoto = new Map<string, unknown[]>();
            for (const t of tagsData) {
                const list = tagsByPhoto.get(t.photoId ?? '') || [];
                list.push({ tag_id: t.tagId, tags: { id: t.tagId, name: t.name } });
                tagsByPhoto.set(t.photoId ?? '', list);
            }

            const formatted = data.map(d => {
                const item = { ...d.items } as Record<string, unknown>;
                item.group = d.group ? { ...d.group, member_count: counts.get(d.group.id) || 0 } : null;
                item.photo_tags = tagsByPhoto.get(d.items.id) || [];
                return item;
            });
            return c.json({ success: true, data: formatted });
        }
        return c.json({ success: true, data: [] });
    } catch (error: unknown) {
        throw errorFactory.wrap(error, 'photos.list-by-group', 'QUERY_FAILURE');
    }
  });

  app.post('/list-by-group-paginated', async (c) => {
    const body = await c.req.json();
    const check = ListByGroupReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { groupId, page = 1, pageSize = 100, isAdminMode = false } = check;
    try {
        const offset = (page - 1) * pageSize;
        const baseCondition = and(
            eq(furnitureItems.groupId, groupId),
            !isAdminMode ? eq(furnitureItems.isHidden, false) : undefined
        );

        const [countRes] = await db
            .select({ count: count() })
            .from(furnitureItems)
            .where(baseCondition);

        const data = await db
            .select({
                items: furnitureItems,
                group: groupsTable
            })
            .from(furnitureItems)
            .leftJoin(groupsTable, eq(furnitureItems.groupId, groupsTable.id))
            .where(baseCondition)
            .orderBy(
                desc(furnitureItems.isGroupCover),
                desc(furnitureItems.createdAt),
                asc(furnitureItems.id)
            )
            .limit(pageSize)
            .offset(offset);

        if (data.length > 0) {
            const photoIds = data.map(d => d.items.id);
            const counts = await getGroupCounts([groupId], isAdminMode);
            const tagsData = await db.select({
                photoId: photoTags.photoId,
                tagId: photoTags.tagId,
                name: tagsTable.name
            })
            .from(photoTags)
            .innerJoin(tagsTable, eq(photoTags.tagId, tagsTable.id))
            .where(inArray(photoTags.photoId, photoIds));

            const tagsByPhoto = new Map<string, unknown[]>();
            for (const t of tagsData) {
                const list = tagsByPhoto.get(t.photoId ?? '') || [];
                list.push({ tag_id: t.tagId, tags: { id: t.tagId, name: t.name } });
                tagsByPhoto.set(t.photoId ?? '', list);
            }

            const photosFormatted = data.map(d => {
                const item = { ...d.items } as Record<string, unknown>;
                item.group = d.group ? { ...d.group, member_count: counts.get(d.group.id) || 0 } : null;
                item.photo_tags = tagsByPhoto.get(d.items.id) || [];
                return item;
            });
            return c.json({ success: true, data: { photos: photosFormatted, total: Number(countRes.count) } });
        }
        return c.json({ success: true, data: { photos: [], total: 0 } });
    } catch (error: unknown) {
        throw errorFactory.wrap(error, 'photos.list-by-group-paginated', 'QUERY_FAILURE');
    }
  });

  app.post('/count', async (c) => {
    let body;
    try {
      body = await c.req.json();
    } catch (e) {
      body = {};
    }
    const check = PhotoListReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { categoryId, tagId, searchQuery, isAdminMode = false, isHidden } = check;
    try {
        const hasTag = tagId !== undefined && tagId !== null && tagId !== '';
        const hasCat = categoryId !== undefined && categoryId !== null && categoryId !== '';

        const builder = db.select({ count: count() }).from(furnitureItems);
        
        if (hasTag) {
            builder.innerJoin(photoTags, eq(furnitureItems.id, photoTags.photoId));
        }

        const whereClauses: (SQL | undefined)[] = [];
        if (hasTag) whereClauses.push(eq(photoTags.tagId as any, tagId as any));
        if (hasCat) whereClauses.push(eq(furnitureItems.categoryId as any, categoryId as any));

        if (searchQuery && searchQuery.trim().length > 0) {
            const pattern = `%${searchQuery.trim()}%`;
            const searchSql = or(
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
            );
            whereClauses.push(searchSql as SQL);
        }

        if (!isAdminMode) {
            whereClauses.push(eq(furnitureItems.isHidden, false));
        } else if (isHidden !== undefined && isHidden !== null) {
            whereClauses.push(eq(furnitureItems.isHidden, isHidden));
        }

        if (whereClauses.length > 0) builder.where(and(...whereClauses.filter((c): c is SQL => !!c)));

        const [res] = await builder;
        return c.json({ success: true, data: Number(res.count) });
    } catch (error: unknown) {
        throw errorFactory.wrap(error, 'photos.count', 'QUERY_FAILURE');
    }
  });
};
