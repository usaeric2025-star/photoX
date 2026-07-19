import { errorFactory } from "../_lib/error/factory.js";
import { Hono } from 'hono';
import * as v from 'valibot';
import { db, tags as tagsTable, photoTags } from '../_lib/db/index.js';
import { eq, ilike, asc, inArray, sql, and, ne } from 'drizzle-orm';
import { TagReqSchema } from '../../shared/apiContractSchema.js';
import { errorResponse, successResponse } from '../_lib/response.js';
import { logger } from '../_lib/logger.js';

let tagsCache: Record<string, unknown>[] | null = null;
let tagsCacheTime = 0;

function clearTagsCache() {
    logger.info('[Tags Cache] Cleared tags list cache');
    tagsCache = null;
    tagsCacheTime = 0;
}

export const tags = new Hono()
  .get('/', async (c) => {
    const now = Date.now();
    if (tagsCache && now - tagsCacheTime < 5 * 60 * 1000) {
        logger.debug('[Tags Cache] Returning cached tags');
        return successResponse(c, tagsCache);
    }
    const data = await db.select().from(tagsTable).orderBy(asc(tagsTable.name));
    tagsCache = data;
    tagsCacheTime = now;
    return successResponse(c, data);
  })
  .get('/search', async (c) => {
    const keyword = c.req.query('keyword') || '';
    const query = db.select().from(tagsTable).orderBy(asc(tagsTable.name));
    
    const filteredQuery = keyword 
      ? query.where(ilike(tagsTable.name, `%${keyword}%`))
      : query;

    const data = await filteredQuery.limit(20);
    return successResponse(c, data);
  })
  .put('/:id{[0-9]+}', async (c) => {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const check = v.safeParse(v.object({ updates: v.omit(TagReqSchema, ["id"]) }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { updates } = check.output;
    await db.update(tagsTable).set(updates).where(eq(tagsTable.id, id));
    clearTagsCache();
    return successResponse(c, null);
  })
  .post('/', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ tagData: TagReqSchema }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { tagData } = check.output;
    const [data] = await db.insert(tagsTable).values(tagData).returning();
    clearTagsCache();
    return successResponse(c, data);
  })
  .post('/batch', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ tags: v.array(TagReqSchema) }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { tags: tagsData } = check.output;
    const data = await db.insert(tagsTable).values(tagsData).returning({ id: tagsTable.id, name: tagsTable.name });
    clearTagsCache();
    return successResponse(c, data);
  })
  .delete('/:id{[0-9]+}', async (c) => {
    const id = parseInt(c.req.param('id'));
    await db.delete(tagsTable).where(eq(tagsTable.id, id));
    clearTagsCache();
    return successResponse(c, null);
  })
  .post('/refresh-hot-scores', async (c) => {
    await db.execute(sql`SELECT refresh_tag_hot_scores()`);
    clearTagsCache();
    return successResponse(c, null);
  })
  .post('/remove-from-photo', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ photoId: v.string(), tagId: v.number() }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { photoId, tagId } = check.output;
    await db.delete(photoTags).where(and(eq(photoTags.photoId, photoId), eq(photoTags.tagId, tagId)));
    return successResponse(c, null);
  })
  .post('/sync-photo-tags', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ 
      photoId: v.string(), 
      tagIds: v.array(v.union([v.number(), v.string()])),
      tagWeights: v.optional(v.record(v.string(), v.number())),
      tagSources: v.optional(v.record(v.string(), v.union([v.literal('ai'), v.literal('user'), v.literal('system')])))
    }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { photoId, tagWeights, tagSources } = check.output;
    const tagIds = check.output.tagIds.map(id => Number(id)).filter(id => !isNaN(id));
    
    // 1. Fetch current associations
    const currentAssociations = await db.select({ tagId: photoTags.tagId }).from(photoTags).where(eq(photoTags.photoId, photoId));
    const existingTagIds = new Set(currentAssociations.map(pt => pt.tagId));

    // 2. Query target tags for details
    const tagDetails = await db.select({ id: tagsTable.id, isPinned: tagsTable.isPinned }).from(tagsTable).where(inArray(tagsTable.id, tagIds));
    const tagDetailsMap = new Map(tagDetails.map(t => [t.id, t]));

    const getWeight = (tagId: number, tagDetail?: { isPinned?: boolean | null } | null): number => {
      const tagStr = String(tagId);
      if (tagWeights && tagWeights[tagStr] !== undefined) {
        const w = tagWeights[tagStr];
        if (typeof w === 'number') return w;
      }
      if (tagSources && tagSources[tagStr]) {
        const src = tagSources[tagStr];
        if (src === 'ai') return 100;
        if (src === 'user') return 90;
        if (src === 'system') return 50;
      }
      if (tagDetail?.isPinned) return 100;
      return 50;
    };

    // 3. Sort and limit
    const sortedTagIds = [...tagIds].sort((a, b) => {
      const weightA = getWeight(a, tagDetailsMap.get(a));
      const weightB = getWeight(b, tagDetailsMap.get(b));
      if (weightB !== weightA) return weightB - weightA;
      if (existingTagIds.has(a) && !existingTagIds.has(b)) return -1;
      if (!existingTagIds.has(a) && existingTagIds.has(b)) return 1;
      return tagIds.indexOf(a) - tagIds.indexOf(b);
    });

    const limitedTagIds = sortedTagIds.slice(0, 3);

    // 4. Update junction table
    await db.delete(photoTags).where(eq(photoTags.photoId, photoId));
    if (limitedTagIds.length > 0) {
      await db.insert(photoTags).values(limitedTagIds.map(tagId => ({ photoId, tagId })));
    }
    return successResponse(c, null);
  })
  .post('/sync-batch-photo-tags', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ 
      photoIds: v.array(v.string()), 
      tagIds: v.array(v.union([v.number(), v.string()])),
      tagWeights: v.optional(v.record(v.string(), v.number())),
      tagSources: v.optional(v.record(v.string(), v.union([v.literal('ai'), v.literal('user'), v.literal('system')])))
    }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { photoIds, tagWeights, tagSources } = check.output;
    const tagIds = check.output.tagIds.map(id => Number(id)).filter(id => !isNaN(id));
    
    const tagDetails = await db.select({ id: tagsTable.id, isPinned: tagsTable.isPinned }).from(tagsTable).where(inArray(tagsTable.id, tagIds));
    const tagDetailsMap = new Map(tagDetails.map(t => [t.id, t]));

    const getWeight = (tagId: number, tagDetail?: { isPinned?: boolean | null } | null): number => {
      const tagStr = String(tagId);
      if (tagWeights && tagWeights[tagStr] !== undefined) {
        const w = tagWeights[tagStr];
        if (typeof w === 'number') return w;
      }
      if (tagSources && tagSources[tagStr]) {
        const src = tagSources[tagStr];
        if (src === 'ai') return 100;
        if (src === 'user') return 90;
        if (src === 'system') return 50;
      }
      if (tagDetail?.isPinned) return 100;
      return 50;
    };

    const sortedTagIds = [...tagIds].sort((a, b) => {
      const weightA = getWeight(a, tagDetailsMap.get(a));
      const weightB = getWeight(b, tagDetailsMap.get(b));
      if (weightB !== weightA) return weightB - weightA;
      return tagIds.indexOf(a) - tagIds.indexOf(b);
    });

    const limitedTagIds = sortedTagIds.slice(0, 3);

    await db.delete(photoTags).where(inArray(photoTags.photoId, photoIds));
    if (limitedTagIds.length > 0) {
      const associations = photoIds.flatMap(photoId => limitedTagIds.map(tagId => ({ photoId, tagId })));
      await db.insert(photoTags).values(associations);
    }
    return successResponse(c, null);
  });
