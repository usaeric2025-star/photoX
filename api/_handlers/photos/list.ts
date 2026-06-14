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
      categoryId, tagId, searchQuery,
      isAdminMode = false, 
      onlyUngrouped = false, manufacturerId, 
      isHidden,
      sortOrder
    } = check;
    
    const supabase = await getSupabaseAdmin();
    
    let query = supabase.from(TABLE_NAME).select(`*, photo_tags${tagId ? '!inner' : ''}(tag_id)`);
    
    // Filters
    if (tagId !== undefined && tagId !== null) {
      query = query.eq('photo_tags.tag_id', String(tagId));
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      const dbSearchQuery = decodeURIComponent(searchQuery).replace(/[%_]/g, '\\$&').trim();
      query = query.or(`name.ilike.%${dbSearchQuery}%,ai_description.ilike.%${dbSearchQuery}%`);
    }

    if (onlyUngrouped) query = query.is('group_id', null);
    if (!isAdminMode) query = query.or('is_hidden.is.false,is_hidden.is.null'); // Simplified visibility
    else if (isHidden !== undefined && isHidden !== null) query = query.eq('is_hidden', isHidden);
    
    if (manufacturerId !== undefined && manufacturerId !== null) {
      query = query.eq('manufacturer_id', String(manufacturerId));
    }
    if (categoryId !== undefined && categoryId !== null) {
      query = query.eq('category_id', String(categoryId));
    }
    
    // Sort
    query = query.order('is_pinned', { ascending: false });

    if (sortOrder === 'newest') query = query.order('created_at', { ascending: false }).order('id', { ascending: false });
    else if (sortOrder === 'oldest') query = query.order('created_at', { ascending: true }).order('id', { ascending: true });
    else if (sortOrder === 'name') query = query.order('name', { ascending: true }).order('id', { ascending: true });
    else query = query.order('created_at', { ascending: false }).order('id', { ascending: false }); // Default
    
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

    const { categoryId, tagId, searchQuery, isAdminMode = false, isHidden } = check;
    const supabase = await getSupabaseAdmin();
    let query = supabase.from(TABLE_NAME).select(tagId ? 'id, photo_tags!inner(tag_id)' : 'id', { count: 'exact', head: true });

    if (tagId !== undefined && tagId !== null) {
      query = query.eq('photo_tags.tag_id', String(tagId));
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      const dbSearchQuery = decodeURIComponent(searchQuery).replace(/[%_]/g, '\\$&').trim();
      query = query.or(`name.ilike.%${dbSearchQuery}%,ai_description.ilike.%${dbSearchQuery}%`);
    }

    if (!isAdminMode) query = query.or('is_hidden.is.false,is_hidden.is.null');
    else if (isHidden !== undefined && isHidden !== null) query = query.eq('is_hidden', isHidden);
    
    if (categoryId !== undefined && categoryId !== null) {
      query = query.eq('category_id', String(categoryId));
    }
    
    const { count, error } = await query;
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data: count || 0 });
  });
};
