import { Hono } from 'hono';
import { type } from 'arktype';
import { db, furnitureItems, groups as groupsTable, tags as tagsTable, photoTags } from '../../_lib/db/index.js';
import { eq, ne, and, or, ilike, sql, asc, desc, inArray, isNull, count, type SQL } from 'drizzle-orm';
import { PhotoListReqSchema, ListByGroupReqSchema } from '../../_shared/apiContractSchema.js';
import { errorFactory } from '../../_lib/error/AppError.js';

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
      page = 0, limit = 1000, 
      categoryId, tagId, searchQuery,
      isAdminMode = false, 
      onlyUngrouped = false, manufacturerId, 
      isHidden,
      sortOrder
    } = check;
    
    try {
      const hasTag = tagId !== undefined && tagId !== null && tagId !== '';
      const hasCat = categoryId !== undefined && categoryId !== null && categoryId !== '';

      const baseQuery = db.select().from(furnitureItems);
      
      // We will build the where clause
      const whereClauses: (SQL | undefined)[] = [];

      if (hasTag && hasCat) {
          // This is a bit complex for standard builder when we need to join tags.
          // For now, let's use the query API for easier relations
      }

      // Actually, building manual joins in Drizzle is better for complex filtering.
      const query = db
        .select({
            photo: furnitureItems,
            group: {
                id: groupsTable.id,
                name: groupsTable.name,
                coverPhotoId: groupsTable.coverPhotoId,
                status: groupsTable.status,
            }
        })
        .from(furnitureItems)
        .leftJoin(groupsTable, eq(furnitureItems.groupId, groupsTable.id));

      if (hasTag) {
          query.innerJoin(photoTags, eq(furnitureItems.id, photoTags.photoId));
          whereClauses.push(eq(photoTags.tagId as any, tagId as any));
      }

      if (hasCat) {
          whereClauses.push(eq(furnitureItems.categoryId as any, categoryId as any));
      }

      if (searchQuery && searchQuery.trim().length > 0) {
        const pattern = `%${searchQuery.trim()}%`;
        whereClauses.push(or(
            ilike(sql`${furnitureItems.name}->>'zh'`, pattern),
            ilike(sql`${furnitureItems.name}->>'en'`, pattern),
            ilike(sql`${furnitureItems.name}->>'ms'`, pattern),
            ilike(furnitureItems.manualCode, pattern),
            ilike(furnitureItems.modelNumber, pattern),
            ilike(furnitureItems.itemCode, pattern)
        ));
      }

      if (onlyUngrouped) whereClauses.push(isNull(furnitureItems.groupId));
      
      if (!isAdminMode) {
        whereClauses.push(eq(furnitureItems.isHidden, false));
      } else if (isHidden !== undefined && isHidden !== null) {
        whereClauses.push(eq(furnitureItems.isHidden, isHidden));
      }
      
      if (manufacturerId !== undefined && manufacturerId !== null) {
        whereClauses.push(eq(furnitureItems.manufacturerId as any, manufacturerId as any));
      }

      const finalWhere = whereClauses.length > 0 ? and(...whereClauses.filter((c): c is SQL => !!c)) : undefined;
      
      // BACK TO BUILDER STYLE
      const builder = db
        .select({
            items: furnitureItems,
            group: groupsTable
        })
        .from(furnitureItems)
        .leftJoin(groupsTable, eq(furnitureItems.groupId, groupsTable.id));

      if (hasTag) {
        builder.innerJoin(photoTags, eq(furnitureItems.id, photoTags.photoId));
      }

      if (finalWhere) builder.where(finalWhere);

      // Ordering
      const orderClauses: SQL[] = [desc(furnitureItems.isPinned)];
      if (sortOrder === 'newest') orderClauses.push(desc(furnitureItems.createdAt), desc(furnitureItems.id));
      else if (sortOrder === 'oldest') orderClauses.push(asc(furnitureItems.createdAt), asc(furnitureItems.id));
      else if (sortOrder === 'name') orderClauses.push(asc(sql`${furnitureItems.name}->>'zh'`), asc(furnitureItems.id));
      else orderClauses.push(desc(furnitureItems.createdAt), desc(furnitureItems.id));

      builder.orderBy(...orderClauses);
      
      // Pagination
      builder.limit(limit).offset(page * limit);

      const data = await builder;

      // Group counts and Tags
      if (data.length > 0) {
        const photoIds = data.map(d => d.items.id);
        const gIds = Array.from(new Set(data.filter(d => d.items.groupId).map(d => d.items.groupId))) as string[];
        
        const [counts, tagsData] = await Promise.all([
            getGroupCounts(gIds, isAdminMode),
            db.select({
                photoId: photoTags.photoId,
                tagId: photoTags.tagId,
                name: tagsTable.name
            })
            .from(photoTags)
            .innerJoin(tagsTable, eq(photoTags.tagId, tagsTable.id))
            .where(inArray(photoTags.photoId, photoIds))
        ]);

        const tagsByPhoto = new Map<string, unknown[]>();
        for (const t of tagsData) {
            const list = tagsByPhoto.get(t.photoId ?? '') || [];
            list.push({ tag_id: t.tagId, tags: { id: t.tagId, name: t.name } });
            tagsByPhoto.set(t.photoId ?? '', list);
        }

        const formatted = data.map(d => {
            const item = { ...d.items } as Record<string, unknown>;
            // Legacy format matching
            item.group = d.group ? { ...d.group, member_count: counts.get(d.group.id) || 0 } : null;
            item.photo_tags = tagsByPhoto.get(d.items.id) || [];
            return item;
        });

        return c.json({ success: true, data: formatted });
      }

      return c.json({ success: true, data: [] });
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
            whereClauses.push(or(
                ilike(sql`${furnitureItems.name}->>'zh'`, pattern),
                ilike(sql`${furnitureItems.name}->>'en'`, pattern),
                ilike(sql`${furnitureItems.name}->>'ms'`, pattern),
                ilike(furnitureItems.manualCode, pattern),
                ilike(furnitureItems.modelNumber, pattern),
                ilike(furnitureItems.itemCode, pattern)
            ) as SQL);
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
