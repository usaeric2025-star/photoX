import { Hono } from 'hono';
import * as v from 'valibot';
import { db, furnitureItems, groups as groupsTable, tags as tagsTable, photoTags, categories, vPhotosList } from '../../_lib/db/index.js';
import { eq, ne, and, or, ilike, sql, asc, desc, inArray, isNull, count, exists, type SQL } from 'drizzle-orm';
import { PhotoListReqSchema, ListByGroupReqSchema, PhotoListItem, PhotoListItemSchema } from '../../_shared/apiContractSchema.js';
import { errorFactory } from '../../_lib/error/AppError.js';
import { normalizeI18n } from '../../_shared/i18n.js';

import { getGroupCounts } from './helpers.js';

export const listHandler = (app: Hono) => {
  app.post('/list', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(PhotoListReqSchema, body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { 
      page = 0, limit = 100, cursor,
      categoryId, tagId, searchQuery,
      isAdminMode = false, 
      onlyUngrouped = false, onlyGroupsCover = false,
      groupId, manufacturerId, 
      isHidden,
      sortOrder
    } = check.output;
    
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
        whereClauses.push(sql`${Number(tagId)} = ANY(${vPhotosList.tagIds})`);
      }

      if (hasCat) {
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
                createdAt: d.createdAt ? (d.createdAt as unknown as Date).toISOString() : null,
            } as PhotoListItem;
        });

        // ✅ 契約驗證
        const hasMore = total > (page * limit + data.length);
        const nextCursor = (data.length === limit && hasMore) ? formatted[formatted.length - 1].createdAt : null;
        
        return c.json({ 
          success: true, 
          data: v.parse(v.array(PhotoListItemSchema), formatted),
          nextCursor,
          total
        });
      }

      return c.json({ success: true, data: [], nextCursor: null, total: 0 });
    } catch (error: unknown) {
      throw errorFactory.wrap(error, 'photos.list', 'QUERY_FAILURE');
    }
  });

  };
