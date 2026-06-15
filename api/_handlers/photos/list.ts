import { Hono } from 'hono';
import { type } from 'arktype';
import { getSupabaseAdmin } from '../../_lib/supabase.js';
import { PhotoListReqSchema, ListByGroupReqSchema } from '../../_shared/apiContractSchema.js';

const TABLE_NAME = 'furniture_items';

interface CachedTags {
  data: any[];
  timestamp: number;
}
let tagsCache: CachedTags | null = null;
const CACHE_TTL = 30000; // 30 seconds

async function getCachedTags(supabase: any) {
  const now = Date.now();
  if (tagsCache && now - tagsCache.timestamp < CACHE_TTL) {
    return tagsCache.data;
  }
  const { data: tagRows, error } = await supabase.from('tags').select('id, name');
  if (error) {
    // Fallback to stale cache if error occurs, to be robust
    return tagsCache ? tagsCache.data : [];
  }
  tagsCache = {
    data: tagRows || [],
    timestamp: now
  };
  return tagsCache.data;
}

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
    
    let query = supabase.from(TABLE_NAME).select(`*, photo_tags${tagId ? '!inner' : ''}(tag_id), group:groups(id, name, cover_photo_id, member_count)`);
    
    // Filters
    if (tagId !== undefined && tagId !== null) {
      query = query.eq('photo_tags.tag_id', String(tagId));
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      const dbSearchQuery = decodeURIComponent(searchQuery).replace(/[%_]/g, '\\$&').trim();
      // Expanded search: multilingual names + codes + models
      const fields = [
        `name->>zh.ilike."%${dbSearchQuery}%"`,
        `name->>en.ilike."%${dbSearchQuery}%"`,
        `name->>ms.ilike."%${dbSearchQuery}%"`,
        `manual_code.ilike."%${dbSearchQuery}%"`,
        `model_number.ilike."%${dbSearchQuery}%"`,
        `item_code.ilike."%${dbSearchQuery}%"`
      ];
      query = query.or(fields.join(','));
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
    
    const [queryRes, tagRows] = await Promise.all([
      query,
      getCachedTags(supabase)
    ]);
    const { data, error } = queryRes;
    if (error) return c.json({ success: false, error: error.message }, 500);

    // In-memory join for tags details to prevent database configuration issues
    if (data && data.length > 0 && tagRows && tagRows.length > 0) {
      const tagMap = new Map(tagRows.map((t: any) => [String(t.id), t.name]));
      for (const item of data) {
        if (Array.isArray(item.photo_tags)) {
          for (const pt of item.photo_tags) {
            if (pt && pt.tag_id) {
              const nameVal = tagMap.get(String(pt.tag_id)) || '';
              pt.tags = { id: pt.tag_id, name: nameVal };
            }
          }
        }
      }
    }
    
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
    const [queryRes, tagRows] = await Promise.all([
      query,
      getCachedTags(supabase)
    ]);
    if (queryRes.error) return c.json({ success: false, error: queryRes.error.message }, 500);

    const data = queryRes.data || [];
    if (data.length > 0 && tagRows && tagRows.length > 0) {
      const tagMap = new Map(tagRows.map((t: any) => [String(t.id), t.name]));
      for (const item of data) {
        if (Array.isArray(item.photo_tags)) {
          for (const pt of item.photo_tags) {
            if (pt && pt.tag_id) {
              const nameVal = tagMap.get(String(pt.tag_id)) || '';
              pt.tags = { id: pt.tag_id, name: nameVal };
            }
          }
        }
      }
    }

    return c.json({ success: true, data: data || [] });
  });

  app.post('/list-by-group-paginated', async (c) => {
    const body = await c.req.json();
    const check = ListByGroupReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { groupId, page = 1, pageSize = 100, isAdminMode = false } = check;
    const supabase = await getSupabaseAdmin();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let countQuery = supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true }).eq('group_id', groupId);
    let query = supabase.from(TABLE_NAME).select('*, photo_tags(tag_id)').eq('group_id', groupId);
    if (!isAdminMode) {
      countQuery = countQuery.or('is_hidden.is.false,is_hidden.is.null'); 
      query = query.or('is_hidden.is.false,is_hidden.is.null');
    }
    const [countRes, queryRes, tagRows] = await Promise.all([
      countQuery,
      query.order('is_group_cover', { ascending: false })
           .order('group_order', { ascending: true, nullsFirst: true }) // Changed to true to show un-ordered items
           .order('created_at', { ascending: false })
           .order('id', { ascending: true })
           .range(from, to),
      getCachedTags(supabase)
    ]);
    if (queryRes.error) return c.json({ success: false, error: queryRes.error.message }, 500);

    const photos = queryRes.data || [];
    if (photos.length > 0 && tagRows && tagRows.length > 0) {
        const tagMap = new Map(tagRows.map((t: any) => [String(t.id), t.name]));
        for (const item of photos) {
          if (Array.isArray(item.photo_tags)) {
            for (const pt of item.photo_tags) {
              if (pt && pt.tag_id) {
                const nameVal = tagMap.get(String(pt.tag_id)) || '';
                pt.tags = { id: pt.tag_id, name: nameVal };
              }
            }
          }
        }
    }

    return c.json({ success: true, data: { photos, total: countRes.count || 0 } });
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
      // Expanded search: multilingual names + codes + models
      const fields = [
        `name->>zh.ilike."%${dbSearchQuery}%"`,
        `name->>en.ilike."%${dbSearchQuery}%"`,
        `name->>ms.ilike."%${dbSearchQuery}%"`,
        `manual_code.ilike."%${dbSearchQuery}%"`,
        `model_number.ilike."%${dbSearchQuery}%"`,
        `item_code.ilike."%${dbSearchQuery}%"`
      ];
      query = query.or(fields.join(','));
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
