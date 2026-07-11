import * as v from 'valibot';
import { db, furnitureItems, groups as groupsTable, tags as tagsTable, photoTags, categories } from '../../_lib/db/index.js';
import { eq, ne, and, or, ilike, sql, asc, desc, inArray, isNull, count, type SQL } from 'drizzle-orm';
import { ListByGroupReqSchema, PhotoListReqSchema } from '../../../shared/apiContractSchema.js';
import { errorResponse, successResponse } from '../../_lib/response.js';
import { errorFactory } from '../../_lib/error/factory.js';
import { getGroupCounts } from '../../_lib/db/queries/photos.js';

import { Hono, type Context } from 'hono';

const countCache = new Map<string, number>();
const countCacheTime = new Map<string, number>();

export const listExtendedRoutes = new Hono()
  .post('/list-by-group', async (c: Context) => {
    const body = await c.req.json();
    const check = v.safeParse(ListByGroupReqSchema, body);
    if (!check.success) throw new Error(check.issues[0].message);
    
    const { groupId, isAdminMode = false } = check.output;
    try {
        const query = db
            .select({
                items: furnitureItems,
                group: groupsTable,
                category: categories
            })
            .from(furnitureItems)
            .leftJoin(groupsTable, eq(furnitureItems.groupId, groupsTable.id))
            .leftJoin(categories, eq(furnitureItems.categoryId, categories.id))
            .where(and(
                eq(furnitureItems.groupId, groupId),
                !isAdminMode ? or(eq(furnitureItems.isHidden, false), isNull(furnitureItems.isHidden)) : undefined
            ))
            .orderBy(
                desc(furnitureItems.isGroupCover),
                sql`case when ${furnitureItems.isPinned} = true then 0 else 1 end asc`,
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
                list.push({ tagId: t.tagId, tags: { id: t.tagId, name: t.name } });
                tagsByPhoto.set(t.photoId ?? '', list);
            }

            const photosFormatted = data.map(d => {
                const item = { ...d.items } as Record<string, unknown>;
                item.group = d.group ? { ...d.group, memberCount: counts.get(d.group.id) || 0 } : null;
                item.photoTags = tagsByPhoto.get(d.items.id) || [];
                item.categoryName = (d as any).category?.name || null;
                item.categoryDescription = (d as any).category?.description || null;
                if (item.createdAt) {
                    item.createdAt = typeof item.createdAt === 'string' ? item.createdAt : (item.createdAt as Date).toISOString();
                }
                
                return item;
            });
            return successResponse(c, photosFormatted);
        }
        return successResponse(c, []);
    } catch (error: unknown) {
        throw errorFactory.wrap(error, 'photos.list-by-group', 'QUERY_FAILURE');
    }
  })
  .post('/list-by-group-paginated', async (c: Context) => {
    const body = await c.req.json();
    const check = v.safeParse(ListByGroupReqSchema, body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { groupId, page = 1, pageSize = 100, isAdminMode = false } = check.output;
    try {
        const offset = (page - 1) * pageSize;
        const baseCondition = and(
            eq(furnitureItems.groupId, groupId),
            !isAdminMode ? or(eq(furnitureItems.isHidden, false), isNull(furnitureItems.isHidden)) : undefined
        );

        const [countRes] = await db
            .select({ count: count() })
            .from(furnitureItems)
            .where(baseCondition);

        const data = await db
            .select({
                items: furnitureItems,
                group: groupsTable,
                category: categories
            })
            .from(furnitureItems)
            .leftJoin(groupsTable, eq(furnitureItems.groupId, groupsTable.id))
            .leftJoin(categories, eq(furnitureItems.categoryId, categories.id))
            .where(baseCondition)
            .orderBy(
                desc(furnitureItems.isGroupCover),
                sql`case when ${furnitureItems.isPinned} = true then 0 else 1 end asc`,
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
                list.push({ tagId: t.tagId, tags: { id: t.tagId, name: t.name } });
                tagsByPhoto.set(t.photoId ?? '', list);
            }

            const photosFormatted = data.map(d => {
                const item = { ...d.items } as Record<string, unknown>;
                item.group = d.group ? { ...d.group, memberCount: counts.get(d.group.id) || 0 } : null;
                item.photoTags = tagsByPhoto.get(d.items.id) || [];
                item.categoryName = (d as any).category?.name || null;
                item.categoryDescription = (d as any).category?.description || null;
                if (item.createdAt) {
                    item.createdAt = typeof item.createdAt === 'string' ? item.createdAt : (item.createdAt as Date).toISOString();
                }

                return item;
            });
            return successResponse(c, { items: photosFormatted, total: Number(countRes.count) });
        }
        return successResponse(c, { items: [], total: Number(countRes.count) || 0 });
    } catch (error: unknown) {
        throw errorFactory.wrap(error, 'photos.list-by-group-paginated', 'QUERY_FAILURE');
    }
  });
