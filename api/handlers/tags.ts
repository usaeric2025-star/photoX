import { Hono } from 'hono';
import { getSupabaseAdmin } from '../lib/supabase.js';

export const tags = new Hono()
  .get('/search', async (c) => {
    const keyword = c.req.query('keyword') || '';
    const supabase = await getSupabaseAdmin();

    let query = supabase
      .from('tags')
      .select('id, name')
      .order('name', { ascending: true })
      .limit(50);

    if (keyword.trim()) {
      query = query.ilike('name', `%${keyword}%`);
    }

    const { data, error } = await query;

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: data || [] });
  });
