import { Hono } from 'hono';
import { getSupabaseAdmin } from '../_lib/supabase.js';

export const search = new Hono()
  .get('/ids', async (c) => {
    const q = c.req.query('q') || '';
    if (!q) return c.json({ success: true, data: { catIds: [], photoIds: [] } });

    const supabase = await getSupabaseAdmin();
    const escapedQ = q.replace(/[\\%_]/g, '\\$&');

    const [tagsRes, catsRes] = await Promise.all([
      supabase.from('tags').select('id').ilike('name', `%${escapedQ}%`),
      supabase.from('categories').select('id').ilike('name', `%${escapedQ}%`)
    ]);

    if (tagsRes.error || catsRes.error) {
      return c.json({ success: false, error: 'Search failed' }, 500);
    }

    const tagIds = (tagsRes.data || []).map((t: { id: string }) => t.id);
    const catIds = (catsRes.data || []).map((c: { id: string }) => c.id);

    let photoIds: string[] = [];
    if (tagIds.length > 0) {
      const { data: ptData, error: ptError } = await supabase.from('photo_tags').select('photo_id').in('tag_id', tagIds);
      if (!ptError && ptData) {
        photoIds = ptData.map((pt: { photo_id: string }) => pt.photo_id);
      }
    }

    return c.json({ 
      success: true, 
      data: { catIds, photoIds } 
    });
  });
