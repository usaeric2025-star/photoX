import { Hono } from 'hono';
import { type } from 'arktype';
import { db, tags as tagsTable, photoTags } from '../../src/db/index.js';
import { eq, ilike, asc, inArray, sql, and, ne } from 'drizzle-orm';
import { TagReqSchema } from '../_shared/apiContractSchema.js';

export const tags = new Hono()
  .get('/search', async (c) => {
    const keyword = c.req.query('keyword') || '';
    try {
      const query = db.select().from(tagsTable).orderBy(asc(tagsTable.name));
      
      const filteredQuery = keyword 
        ? query.where(ilike(tagsTable.name, `%${keyword}%`))
        : query;

      const data = await filteredQuery.limit(20);
      return c.json({ success: true, data });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  })
  .put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const check = type({ updates: TagReqSchema.omit("id") })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { updates } = check;
    try {
      await db.update(tagsTable).set(updates).where(eq(tagsTable.id, id));
      return c.json({ success: true });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  })
  .post('/', async (c) => {
    const body = await c.req.json();
    const check = type({ tagData: TagReqSchema })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { tagData } = check;
    try {
      const [data] = await db.insert(tagsTable).values(tagData).returning();
      return c.json({ success: true, data });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  })
  .post('/batch', async (c) => {
    const body = await c.req.json();
    const check = type({ tags: TagReqSchema.array() })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { tags: tagsData } = check;
    try {
      const data = await db.insert(tagsTable).values(tagsData).returning({ id: tagsTable.id, name: tagsTable.name });
      return c.json({ success: true, data });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    try {
      await db.delete(tagsTable).where(eq(tagsTable.id, id));
      return c.json({ success: true });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  })
  .post('/refresh-hot-scores', async (c) => {
    try {
      await db.execute(sql`SELECT refresh_tag_hot_scores()`);
      return c.json({ success: true });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  })
  .post('/remove-from-photo', async (c) => {
    const body = await c.req.json();
    const check = type({ photoId: "string", tagId: "string" })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { photoId, tagId } = check;
    try {
      await db.delete(photoTags).where(and(eq(photoTags.photoId, photoId), eq(photoTags.tagId, tagId)));
      return c.json({ success: true });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  })
  .post('/sync-photo-tags', async (c) => {
    const body = await c.req.json();
    const check = type({ 
      photoId: "string", 
      tagIds: "string[]",
      "tagWeights?": "Record<string, number>",
      "tagSources?": "Record<string, 'ai' | 'user' | 'system'>"
    })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { photoId, tagIds, tagWeights, tagSources } = check;
    try {
      // 1. Fetch current associations
      const currentAssociations = await db.select({ tagId: photoTags.tagId }).from(photoTags).where(eq(photoTags.photoId, photoId));
      const existingTagIds = new Set(currentAssociations.map(pt => pt.tagId));

      // 2. Query target tags for details
      const tagDetails = await db.select({ id: tagsTable.id, isGlobal: tagsTable.isGlobal }).from(tagsTable).where(inArray(tagsTable.id, tagIds));
      const tagDetailsMap = new Map(tagDetails.map(t => [t.id, t]));

      const getWeight = (tagId: string, tagDetail?: any) => {
        if (tagWeights && tagWeights[tagId] !== undefined) return tagWeights[tagId];
        if (tagSources && tagSources[tagId]) {
          const src = tagSources[tagId];
          if (src === 'ai') return 100;
          if (src === 'user') return 90;
          if (src === 'system') return 50;
        }
        if (tagDetail?.isGlobal) return 50;
        return 90;
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
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  })
  .post('/sync-batch-photo-tags', async (c) => {
    const body = await c.req.json();
    const check = type({ 
      photoIds: "string[]", 
      tagIds: "string[]",
      "tagWeights?": "Record<string, number>",
      "tagSources?": "Record<string, 'ai' | 'user' | 'system'>"
    })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { photoIds, tagIds, tagWeights, tagSources } = check;
    try {
      const tagDetails = await db.select({ id: tagsTable.id, isGlobal: tagsTable.isGlobal }).from(tagsTable).where(inArray(tagsTable.id, tagIds));
      const tagDetailsMap = new Map(tagDetails.map(t => [t.id, t]));

      const getWeight = (tagId: string, tagDetail?: any) => {
        if (tagWeights && tagWeights[tagId] !== undefined) return tagWeights[tagId];
        if (tagSources && tagSources[tagId]) {
          const src = tagSources[tagId];
          if (src === 'ai') return 100;
          if (src === 'user') return 90;
          if (src === 'system') return 50;
        }
        if (tagDetail?.isGlobal) return 50;
        return 90;
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
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });
