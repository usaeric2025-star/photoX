import { Hono } from 'hono';
import * as v from 'valibot';
import { errorResponse, successResponse } from '../../_lib/response.js';
import { errorFactory } from '../../_lib/error/factory.js';
import { normalizeI18n } from '../../../shared/i18n.js';
import { PhotoListReqSchema, PhotoListItemSchema } from '../../../shared/apiContractSchema.js';
import { getPhotosList, getGroupCounts, type PhotoQueryParams } from '../../_lib/db/queries/photos.js';
import { logger } from '../../_lib/logger.js';

export const listRoutes = new Hono()
  .post('/list', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(PhotoListReqSchema, body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const params = check.output;
    logger.info('POST /api/photos/list params:', params);
    const { page = 1, limit = 100, isAdminMode = false } = params;
    
    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 100;
      const queryParams: PhotoQueryParams = { 
        page: pageNum, 
        limit: limitNum,
        isAdminMode: params.isAdminMode,
        search: params.searchQuery || undefined,
        categoryId: typeof params.categoryId === 'string' ? parseInt(params.categoryId, 10) : (params.categoryId ?? undefined),
        tagId: typeof params.tagId === 'string' ? parseInt(params.tagId, 10) : (params.tagId ?? undefined),
        groupId: params.groupId || undefined,
        onlyGroupsCover: params.onlyGroupsCover || undefined,
        onlyUngrouped: params.onlyUngrouped || undefined,
        sort: (params.sortOrder === 'pinned' ? 'pinned' : 'newest')
      };
      const { items, total, nextCursor } = await getPhotosList(queryParams);

      if (items.length > 0) {
        const gIds = Array.from(new Set(items.filter(d => d && d.groupId).map(d => d!.groupId))) as string[];
        const counts = await getGroupCounts(gIds, isAdminMode);
        
        const formatted = items.map(d => {
            if (!d) return null;
            try {
                const nameObj = normalizeI18n(d.name);
                const descObj = normalizeI18n(d.description);
                
                const displayName = nameObj.zh || nameObj.en || nameObj.ms || 'Unnamed';

                return {
                    id: d.id,
                    name: d.manualCode || displayName,
                    description: descObj,
                    imageUrl: d.imageUrl || '',
                    thumbnailUrl: d.imageUrl || '',
                    imageHash: d.imageHash || null,
                    groupId: d.groupId || null,
                    groupName: d.group?.name || null,
                    categoryId: d.categoryId || null,
                    categoryName: d.category?.name || null,
                    categoryDescription: d.category?.description || null,
                    memberCount: d.groupId ? (counts.get(d.groupId as string) || 0) : 0,
                    tags: d.photoTags || [],
                    isPinned: !!d.isPinned,
                    isHidden: !!d.isHidden,
                    isCover: !!d.isGroupCover,
                    isGroupCover: !!d.isGroupCover,
                    metadata: d.metadata || null,
                    createdAt: d.createdAt 
                        ? (d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt)) 
                        : null,
                };
            } catch (e) {
                logger.error('Error formatting item', { id: d.id, error: e });
                return null;
            }
        }).filter((item): item is NonNullable<typeof item> => item !== null);

        const finalNextCursor = nextCursor 
            ? (nextCursor instanceof Date ? nextCursor.toISOString() : String(nextCursor))
            : null;
        
        return successResponse(c, {
          items: formatted,
          nextCursor: finalNextCursor,
          total,
          page
        });
      }

      return successResponse(c, { items: [], nextCursor: null, total: total || 0, page });
    } catch (error: unknown) {
      throw errorFactory.wrap(error, 'photos.list', 'QUERY_FAILURE');
    }
  });
