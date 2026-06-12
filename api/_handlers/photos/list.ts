import { Hono } from 'hono';
import { type } from 'arktype';
import { getSupabaseAdmin } from '../../_lib/supabase.js';
import { PhotoListReqSchema, ListByGroupReqSchema } from '../../_shared/apiContractSchema.js';

const TABLE_NAME = 'furniture_items';

export const listHandler = (app: Hono) => {
  app.post('/list', async (c) => {
    const body = await c.req.json();
    const check = PhotoListReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { 
      page = 0, limit = 1000, 
      categoryId, tagId, 
      isAdminMode = false, 
      onlyUngrouped = false, manufacturerId, 
      isHidden 
    } = check;
    
    const supabase = await getSupabaseAdmin();
    
    let query = supabase.from(TABLE_NAME).select('*, photo_tags(tag_id)');
    
    // Filters
    if (onlyUngrouped) query = query.is('group_id', null);
    if (!isAdminMode) query = query.or('is_hidden.is.false,is_hidden.is.null'); // Simplified visibility
    else if (isHidden !== undefined && isHidden !== null) query = query.eq('is_hidden', isHidden);
    
    if (manufacturerId) query = query.eq('manufacturer_id', manufacturerId);
    if (categoryId) query = query.eq('category_id', categoryId);
    
    const from = page * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    
    const { data, error } = await query;
    if (error) return c.json({ success: false, error: error.message }, 500);
    
    return c.json({ success: true, data: data || [] });
  });

  app.post('/list-by-group', async (c) => {
    const body = await c.req.json();
    const check = ListByGroupReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);
    
    const { groupId, isAdminMode = false } = check;
    const supabase = await getSupabaseAdmin();
    let query = supabase.from(TABLE_NAME).select('*, photo_tags(tag_id)').eq('group_id', groupId);
    if (!isAdminMode) query = query.or('is_hidden.is.false,is_hidden.is.null');
    query = query.order('is_group_cover', { ascending: false }).order('is_hidden', { ascending: true, nullsFirst: true }).order('created_at', { ascending: false }).order('id', { ascending: true });
    const { data, error } = await query;
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data: data || [] });
  });

  app.post('/list-by-group-paginated', async (c) => {
    const body = await c.req.json();
    const check = ListByGroupReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { groupId, page = 1, pageSize = 30, isAdminMode = false } = check;
    const supabase = await getSupabaseAdmin();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let countQuery = supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true }).eq('group_id', groupId);
    let query = supabase.from(TABLE_NAME).select('*, photo_tags(tag_id)').eq('group_id', groupId);
    if (!isAdminMode) {
      countQuery = countQuery.or('is_hidden.is.false,is_hidden.is.null');
      query = query.or('is_hidden.is.false,is_hidden.is.null');
    }
    const [countRes, queryRes] = await Promise.all([
      countQuery,
      query.order('is_group_cover', { ascending: false }).order('group_order', { ascending: true, nullsFirst: false }).order('is_hidden', { ascending: true, nullsFirst: true }).order('created_at', { ascending: false }).order('id', { ascending: true }).range(from, to)
    ]);
    if (queryRes.error) return c.json({ success: false, error: queryRes.error.message }, 500);
    return c.json({ success: true, data: { photos: queryRes.data || [], total: countRes.count || 0 } });
  });

  app.post('/count', async (c) => {
    const body = await c.req.json();
    const check = PhotoListReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { categoryId, tagId, isAdminMode = false } = check;
    const supabase = await getSupabaseAdmin();
    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true });
    if (!isAdminMode) query = query.or('is_hidden.is.false,is_hidden.is.null');
    if (categoryId) query = query.eq('category_id', categoryId);
    if (tagId) {
      const { data: ptData } = await supabase.from('photo_tags').select('photo_id').eq('tag_id', tagId);
      const ids = (ptData || []).map((pt: any) => String(pt.photo_id));
      if (ids.length > 0) query = query.in('id', ids);
      else return c.json({ success: true, data: 0 });
    }
    const { count, error } = await query;
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data: count || 0 });
  });
};
