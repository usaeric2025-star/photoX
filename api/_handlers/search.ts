import { Hono } from 'hono';
import { db, tags, categories, photoTags } from '../_lib/db/index.js';
import { ilike, inArray } from 'drizzle-orm';

export const search = new Hono()
  .get('/ids', async (c) => {
    const q = c.req.query('q') || '';
    if (!q) return c.json({ success: true, data: { catIds: [], photoIds: [] } });

    try {
        const pattern = `%${q}%`;

        const [tagsRes, catsRes] = await Promise.all([
          db.select({ id: tags.id }).from(tags).where(ilike(tags.name, pattern)),
          db.select({ id: categories.id }).from(categories).where(ilike(categories.nameZh, pattern)) // Simplified for ZH
        ]);

        const tagIds = tagsRes.map(t => t.id);
        const catIds = catsRes.map(c => c.id);

        let photoIds: string[] = [];
        if (tagIds.length > 0) {
          const ptData = await db.select({ photoId: photoTags.photoId })
            .from(photoTags)
            .where(inArray(photoTags.tagId, tagIds));
          photoIds = ptData.map(pt => pt.photoId).filter((id): id is string => id !== null);
        }

        return c.json({ 
          success: true, 
          data: { catIds, photoIds } 
        });
    } catch (error: any) {
        return c.json({ success: false, error: 'Search failed: ' + error.message }, 500);
    }
  });
