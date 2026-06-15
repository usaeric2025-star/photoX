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
        .select('id, code, name_zh')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error) return c.json({ success: false, error: error.message }, 500);

    // Transform to frontend format: { id, name, code }
    const formatted = data.map(item => ({
        id: item.id,
        name: item.name_zh,
        code: item.code,
    }));

    return c.json({ success: true, data: formatted });
  })
  .post('/seed', async (c) => {
    const supabase = await getSupabaseAdmin();
    
    // Clean up
    await supabase.from(TABLE_NAME).delete().neq('id', -1);
    
    const seedData = [
      { code: 'chair', name_zh: '椅子', name_en: 'Chair', name_ms: 'Kerusi', sort_order: 1 },
      { code: 'table', name_zh: '桌子', name_en: 'Table', name_ms: 'Meja', sort_order: 2 },
      { code: 'bed', name_zh: '床具', name_en: 'Bed', name_ms: 'Katil', sort_order: 3 },
      { code: 'cabinet', name_zh: '柜子', name_en: 'Cabinet', name_ms: 'Almari', sort_order: 4 },
      { code: 'office', name_zh: '办公', name_en: 'Office', name_ms: 'Pejabat', sort_order: 5 },
      { code: 'sofa', name_zh: '沙发', name_en: 'Sofa', name_ms: 'Sofa', sort_order: 6 },
      { code: 'others', name_zh: '其他', name_en: 'Others', name_ms: 'Lain-lain', sort_order: 7 }
    ];

    const { error } = await supabase.from(TABLE_NAME).insert(seedData);
    if (error) return c.json({ success: false, error: error.message }, 500);
    
    return c.json({ success: true, message: 'Database seeded successfully' });
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
