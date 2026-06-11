import { Hono } from 'hono';
import { getSupabaseAdmin } from '../_lib/supabase.js';

const TABLE_NAME = 'categories';

export const categories = new Hono()
  .get('/', async (c) => {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('sort_order', { ascending: true });
    
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data: data || [] });
  })
  .post('/clear-photos', async (c) => {
    const { categoryId } = await c.req.json();
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
        .from('furniture_items')
        .update({ category_id: null })
        .eq('category_id', categoryId)
        .select('id');
    
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data: data?.map((i: any) => i.id) || [] });
  })
  .post('/', async (c) => {
    const { categoryData } = await c.req.json();
    const supabase = await getSupabaseAdmin();
    const { error, data } = await supabase
        .from(TABLE_NAME)
        .insert(categoryData)
        .select()
        .single();
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data });
  })
  .put('/:id', async (c) => {
    const id = c.req.param('id');
    const { updates } = await c.req.json();
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(updates)
        .eq('id', id);
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true });
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true });
  });
