import { Hono } from 'hono';
import * as v from 'valibot';
import { PhotoListReqSchema, PhotoListItemSchema } from '../../../shared/apiContractSchema.js';
import { errorFactory } from '../../_lib/error/AppError.js';
import { normalizeI18n } from '../../../shared/i18n.js';
import { vValidator } from '@hono/valibot-validator';
import { getPhotosList, getGroupCounts } from '../../_lib/db/queries/photos.js';

export const listHandler = (app: Hono) => {
  app.post('/list', vValidator('json', PhotoListReqSchema), async (c) => {
    const params = c.req.valid('json');
    const { page = 0, limit = 100, isAdminMode = false } = params;
    
    try {
      const { items, total, nextCursor } = await getPhotosList({ ...params, limit });
      console.log('Got items from getPhotosList', items.length);

      if (items.length > 0) {
        const gIds = Array.from(new Set(items.filter(d => d.groupId).map(d => d.groupId))) as string[];
        const counts = await getGroupCounts(gIds, isAdminMode);
        
        console.log('Got group counts', counts.size);

        const formatted = items.map(d => {
            try {
                const nameObj = normalizeI18n(d.name);
                const descObj = normalizeI18n(d.description);
                
                const displayName = nameObj.zh || nameObj.en || nameObj.ms || 'Unnamed';
                const displayDesc = descObj.zh || descObj.en || descObj.ms || '';

                return {
                    id: d.id,
                    name: d.manualCode || displayName,
                    description: displayDesc,
                    imageUrl: d.imageUrl || '',
                    thumbnailUrl: d.imageUrl || '',
                    imageHash: d.imageHash || null,
                    groupId: d.groupId || null,
                    groupName: d.groupName || null,
                    categoryId: d.categoryId || null,
                    categoryNameZh: d.categoryNameZh || null,
                    categoryNameEn: d.categoryNameEn || null,
                    categoryNameMs: d.categoryNameMs || null,
                    memberCount: d.groupId ? (counts.get(d.groupId) || 0) : 0,
                    tags: d.tags || [],
                    isPinned: !!d.isPinned,
                    isHidden: !!d.isHidden,
                    isCover: !!d.isGroupCover || (d.groupCoverPhotoId === d.id),
                    createdAt: d.createdAt 
                        ? (typeof d.createdAt === 'string' ? d.createdAt : (d.createdAt as unknown as Date).toISOString()) 
                        : null,
                };
            } catch (e) {
                console.error('Error formatting item', d.id, e);
                return null;
            }
        }).filter((item): item is NonNullable<typeof item> => item !== null);

        console.log('Formatted items', formatted.length);
        
        const finalNextCursor = nextCursor 
            ? (typeof nextCursor === 'string' ? nextCursor : (nextCursor as unknown as Date).toISOString())
            : null;
        
        return c.json({ 
          success: true, 
          data: v.parse(v.array(PhotoListItemSchema), formatted),
          nextCursor: finalNextCursor,
          total
        });
      }

      return c.json({ success: true, data: [], nextCursor: null, total: 0 });
    } catch (error: unknown) {
      throw errorFactory.wrap(error, 'photos.list', 'QUERY_FAILURE');
    }
  });
};
