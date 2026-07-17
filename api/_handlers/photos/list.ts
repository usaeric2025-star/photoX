import { Hono } from 'hono';
import * as v from 'valibot';
import { errorResponse, successResponse } from '../../_lib/response.js';
import { errorFactory } from '../../_lib/error/factory.js';
import { normalizeI18n } from '../../../shared/i18n.js';
import { sValidator } from '@hono/standard-validator';
import { PhotoListReqSchema, PhotoListItemSchema } from '../../../shared/apiContractSchema.js';
import { getPhotosList, getGroupCounts } from '../../_lib/db/queries/photos.js';
import { logger } from '../../_lib/logger.js';

export const listRoutes = new Hono()
  .post('/list', sValidator('json', PhotoListReqSchema, (result, c) => {
    if (!result.success) {
      const err = (result as any).error;
      console.error("Validation failed:", JSON.stringify(err, null, 2));
      return errorResponse(c, err?.[0]?.message || 'Validation error', 400);
    }
  }), async (c) => {
    const params = c.req.valid('json'); console.log('POST /api/photos/list params:', params);
    const { page = 1, limit = 100, isAdminMode = false } = params;
    
    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 100;
      const { items, total, nextCursor } = await getPhotosList({ ...params, page: pageNum, limit: limitNum });

      if (items.length > 0) {
        const gIds = Array.from(new Set(items.filter(d => d.groupId).map(d => d.groupId))) as string[];
        const counts = await getGroupCounts(gIds, isAdminMode);
        
        const formatted = items.map(d => {
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
                    groupName: d.groupName || null,
                    categoryId: d.categoryId || null,
                    categoryName: d.categoryName || null,
                    categoryDescription: (d as any).categoryDescription || null,
                    memberCount: d.groupId ? (counts.get(d.groupId as string) || 0) : 0,
                    tags: d.tags || [],
                    isPinned: !!d.isPinned,
                    isHidden: !!d.isHidden,
                    isCover: !!d.isGroupCover || (d.groupCoverPhotoId === d.id),
                    isGroupCover: !!d.isGroupCover || (d.groupCoverPhotoId === d.id),
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
