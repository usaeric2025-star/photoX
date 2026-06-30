import * as v from 'valibot';
import { db, furnitureItems, groups as groupsTable, tags as tagsTable, photoTags, categories } from '../../_lib/db/index.js';
import { eq, ne, and, or, ilike, sql, asc, desc, inArray, isNull, count, type SQL } from 'drizzle-orm';
import { ListByGroupReqSchema, PhotoListReqSchema } from '@shared/apiContractSchema.js';
import { errorFactory } from '../../_lib/error/AppError.js';
import { getGroupCounts } from '../../_lib/db/queries/photos.js';
import { toCamelCaseArray } from '../../_lib/transform.js';

import { Hono, type Context } from 'hono';

export const listExtendedHandlers = (app: Hono) => {
  app.post('/list-by-group', async (c: Context) => {
    const body = await c.req.json();
    const check = v.safeParse(ListByGroupReqSchema, body);
    if (!check.success) throw new Error(check.issues[0].message);
    
    const { groupId, isAdminMode = false } = check.output;
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

            const photosFormatted = data.map(d => {
                const item = { ...d.items } as Record<string, unknown>;
                item.group = d.group ? { ...d.group, member_count: counts.get(d.group.id) || 0 } : null;
                item.photo_tags = tagsByPhoto.get(d.items.id) || [];
                if (item.createdAt) {
                    item.createdAt = typeof item.createdAt === 'string' ? item.createdAt : (item.createdAt as Date).toISOString();
                }
                
                return item;
            });
            return c.json({ success: true, data: toCamelCaseArray(photosFormatted as Record<string, unknown>[]) });
        }
        return c.json({ success: true, data: [] });
    } catch (error: unknown) {
        throw errorFactory.wrap(error, 'photos.list-by-group', 'QUERY_FAILURE');
    }
  });

  app.post('/list-by-group-paginated', async (c: Context) => {
    const body = await c.req.json();
    const check = v.safeParse(ListByGroupReqSchema, body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { groupId, page = 1, pageSize = 100, isAdminMode = false } = check.output;
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
                if (item.createdAt) {
                    item.createdAt = typeof item.createdAt === 'string' ? item.createdAt : (item.createdAt as Date).toISOString();
                }

                return item;
            });
            return c.json({ success: true, data: { photos: toCamelCaseArray(photosFormatted as Record<string, unknown>[]), total: Number(countRes.count) } });
        }
        return c.json({ success: true, data: { photos: [], total: 0 } });
    } catch (error: unknown) {
        throw errorFactory.wrap(error, 'photos.list-by-group-paginated', 'QUERY_FAILURE');
    }
  });

  app.post('/count', async (c: Context) => {
    let body;
    try {
      body = await c.req.json();
    } catch (e) {
      body = {};
    }
    const check = v.safeParse(PhotoListReqSchema, body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { categoryId, tagId, searchQuery, isAdminMode = false, isHidden } = check.output;
    try {
        const hasTag = tagId !== undefined && tagId !== null && tagId !== '';
        const hasCat = categoryId !== undefined && categoryId !== null && categoryId !== '';

        let builder = db.select({ count: count() }).from(furnitureItems).$dynamic();
        
        if (hasTag) {
            builder = builder.innerJoin(photoTags, eq(furnitureItems.id, photoTags.photoId)) as typeof builder;
        }

        const whereClauses: (SQL | undefined)[] = [];
        if (hasTag) whereClauses.push(eq(photoTags.tagId, Number(tagId)));
        if (hasCat) whereClauses.push(eq(furnitureItems.categoryId, Number(categoryId)));

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
