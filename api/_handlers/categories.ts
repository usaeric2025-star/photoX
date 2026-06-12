import { Hono } from 'hono';
import { type } from 'arktype';
import { getSupabaseAdmin } from '../_lib/supabase.js';
import { CategoryReqSchema } from '../_shared/apiContractSchema.js';

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
    const body = await c.req.json();
    const check = type({ categoryId: "string" })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { categoryId } = check;
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
    const body = await c.req.json();
    const check = type({ categoryData: CategoryReqSchema })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { categoryData } = check;
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
    const body = await c.req.json();
    const check = type({ updates: CategoryReqSchema.omit("id") })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { updates } = check;
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
