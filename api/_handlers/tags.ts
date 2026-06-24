import { Hono } from 'hono';
import * as v from 'valibot';
import { db, tags as tagsTable, photoTags } from '../_lib/db/index.js';
import { eq, ilike, asc, inArray, sql, and, ne } from 'drizzle-orm';
import { TagReqSchema } from '../_shared/apiContractSchema.js';

export const tags = new Hono()
  .get('/', async (c) => {
    try {
      const data = await db.select().from(tagsTable).orderBy(asc(tagsTable.name));
      return c.json({ success: true, data });
    } catch (error: unknown) {
      return c.json({ success: false, error: (error instanceof Error ? error.message : String(error)) }, 500);
    }
  })
  .get('/search', async (c) => {
    const keyword = c.req.query('keyword') || '';
    try {
      const query = db.select().from(tagsTable).orderBy(asc(tagsTable.name));
      
      const filteredQuery = keyword 
        ? query.where(ilike(tagsTable.name, `%${keyword}%`))
        : query;

      const data = await filteredQuery.limit(20);
      return c.json({ success: true, data });
    } catch (error: unknown) {
      return c.json({ success: false, error: (error instanceof Error ? error.message : String(error)) }, 500);
    }
  })
  .put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const check = v.safeParse(v.object({ updates: v.omit(TagReqSchema, ["id"]) }), body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { updates } = check.output;
    try {
      await db.update(tagsTable).set(updates).where(eq(tagsTable.id, parseInt(id)));
      return c.json({ success: true });
    } catch (error: unknown) {
      return c.json({ success: false, error: (error instanceof Error ? error.message : String(error)) }, 500);
    }
  })
  .post('/', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ tagData: TagReqSchema }), body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { tagData } = check.output;
    try {
      const [data] = await db.insert(tagsTable).values(tagData).returning();
      return c.json({ success: true, data });
    } catch (error: unknown) {
      return c.json({ success: false, error: (error instanceof Error ? error.message : String(error)) }, 500);
    }
  })
  .post('/batch', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ tags: v.array(TagReqSchema) }), body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { tags: tagsData } = check.output;
    try {
      const data = await db.insert(tagsTable).values(tagsData).returning({ id: tagsTable.id, name: tagsTable.name });
      return c.json({ success: true, data });
    } catch (error: unknown) {
      return c.json({ success: false, error: (error instanceof Error ? error.message : String(error)) }, 500);
    }
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    try {
      await db.delete(tagsTable).where(eq(tagsTable.id, parseInt(id)));
      return c.json({ success: true });
    } catch (error: unknown) {
      return c.json({ success: false, error: (error instanceof Error ? error.message : String(error)) }, 500);
    }
  })
  .post('/refresh-hot-scores', async (c) => {
    try {
      await db.execute(sql`SELECT refresh_tag_hot_scores()`);
      return c.json({ success: true });
    } catch (error: unknown) {
      return c.json({ success: false, error: (error instanceof Error ? error.message : String(error)) }, 500);
    }
  })
  .post('/remove-from-photo', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ photoId: v.string(), tagId: v.number() }), body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { photoId, tagId } = check.output;
    try {
      await db.delete(photoTags).where(and(eq(photoTags.photoId, photoId), eq(photoTags.tagId, tagId)));
      return c.json({ success: true });
    } catch (error: unknown) {
      return c.json({ success: false, error: (error instanceof Error ? error.message : String(error)) }, 500);
    }
  })
  .post('/sync-photo-tags', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ 
      photoId: v.string(), 
      tagIds: v.array(v.union([v.number(), v.string()])),
      tagWeights: v.optional(v.record(v.string(), v.number())),
      tagSources: v.optional(v.record(v.string(), v.union([v.literal('ai'), v.literal('user'), v.literal('system')])))
    }), body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { photoId, tagWeights, tagSources } = check.output;
    const tagIds = check.output.tagIds.map(id => Number(id)).filter(id => !isNaN(id));
    try {
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
      return c.json({ success: true });
    } catch (error: unknown) {
      return c.json({ success: false, error: (error instanceof Error ? error.message : String(error)) }, 500);
    }
  })
  .post('/sync-batch-photo-tags', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ 
      photoIds: v.array(v.string()), 
      tagIds: v.array(v.union([v.number(), v.string()])),
      tagWeights: v.optional(v.record(v.string(), v.number())),
      tagSources: v.optional(v.record(v.string(), v.union([v.literal('ai'), v.literal('user'), v.literal('system')])))
    }), body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { photoIds, tagWeights, tagSources } = check.output;
    const tagIds = check.output.tagIds.map(id => Number(id)).filter(id => !isNaN(id));
    try {
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
      return c.json({ success: true });
    } catch (error: unknown) {
      return c.json({ success: false, error: (error instanceof Error ? error.message : String(error)) }, 500);
    }
  });
