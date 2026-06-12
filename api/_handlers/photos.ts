import { Hono } from 'hono';
import { type } from 'arktype';
import { getSupabaseAdmin } from '../_lib/supabase.js';
import { 
    PhotoListReqSchema, 
    PhotoBatchUpdateReqSchema, 
    ListByGroupReqSchema,
    PhotoIdsReqSchema,
    PhotoCheckHashReqSchema,
    PhotoUpdateReqSchema,
    PhotoIdReqSchema
} from '../_shared/apiContractSchema.js';

const TABLE_NAME = 'furniture_items';

export const photos = new Hono()
  .post('/list', async (c) => {
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
  })
  .post('/batch-update', async (c) => {
    const body = await c.req.json();
    const check = PhotoBatchUpdateReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);
    
    const { ids, updates } = check;
    const supabase = await getSupabaseAdmin();
    
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(updates)
        .in('id', ids)
        .select('id');
    
    if (error) return c.json({ success: false, error: error.message }, 500);
    
    return c.json({ success: true, data: data?.map((d: any) => d.id) || [] });
  })
  .post('/list-by-group', async (c) => {
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
  })
  .post('/list-by-group-paginated', async (c) => {
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
  })
  .post('/count', async (c) => {
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
    // Search is simplified
    const { count, error } = await query;
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data: count || 0 });
  })
  .post('/by-ids', async (c) => {
    const body = await c.req.json();
    const check = PhotoIdsReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { ids } = check;
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase.from(TABLE_NAME).select('*, photo_tags(tag_id)').in('id', ids);
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data: data || [] });
  })
  .post('/without-thumb-hash', async (c) => {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase.from(TABLE_NAME).select('id').is('thumb_hash', null);
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data: data || [] });
  })
  .post('/check-hash', async (c) => {
    const body = await c.req.json();
    const check = PhotoCheckHashReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { hash } = check;
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase.from(TABLE_NAME).select('image_url, manual_code').eq('image_hash', hash).limit(1).maybeSingle();
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data });
  })
  .post('/update', async (c) => {
    const body = await c.req.json();
    const check = PhotoUpdateReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { id, updates } = check;
    const supabase = await getSupabaseAdmin();
    
    // Fetch snapshot before update to track if group is changing
    const { data: beforeUpdate } = await supabase.from(TABLE_NAME).select('group_id').eq('id', id).maybeSingle();

    // Special handling for group cover (optimistic quick update)
    const updateObj = updates as any;
    if (updateObj.is_group_cover === true) {
      const { data } = await supabase.from(TABLE_NAME).select('group_id').eq('id', id).maybeSingle();
      if (data?.group_id) {
        await supabase.from(TABLE_NAME).update({ is_group_cover: false }).eq('group_id', data.group_id);
        // Also update groups cover_photo_id
        await supabase.from('groups').update({ cover_photo_id: id }).eq('id', data.group_id);
      }
    }
    const { error } = await supabase.from(TABLE_NAME).update(updates).eq('id', id);
    if (error) return c.json({ success: false, error: error.message }, 500);

    // POST-MUTATION: Reconcile covers & counts since things changed
    const affectedGroupIds: string[] = [];
    if (beforeUpdate?.group_id) affectedGroupIds.push(beforeUpdate.group_id);
    if (updateObj.group_id) affectedGroupIds.push(updateObj.group_id);

    if (affectedGroupIds.length > 0) {
      const { syncGroupCoversAndCount } = await import('../_lib/groups.js');
      await syncGroupCoversAndCount(supabase, affectedGroupIds);
    }

    return c.json({ success: true });
  })
  .post('/upsert', async (c) => {
    const { payload } = await c.req.json();
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase.from(TABLE_NAME).upsert(payload, { onConflict: 'id' }).select('id').maybeSingle();
    if (error) return c.json({ success: false, error: error.message }, 500);

    // If upsert introduced a group_id, reconcile
    if (payload.group_id) {
      const { syncGroupCoversAndCount } = await import('../_lib/groups.js');
      await syncGroupCoversAndCount(supabase, [payload.group_id]);
    }

    return c.json({ success: true, data });
  })
  .post('/delete', async (c) => {
    const body = await c.req.json();
    const check = PhotoIdReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { id, userId } = check;
    const supabase = await getSupabaseAdmin();
    const { data: photoData } = await supabase.from(TABLE_NAME).select('image_url, storage_id, group_id').eq('id', id).maybeSingle();
    
    const { error } = await supabase.from(TABLE_NAME).delete().match({ id, user_id: userId });
    if (error) return c.json({ success: false, error: error.message }, 500);

    // POST-DELETE: Reconcile and count since member is deleted
    if (photoData?.group_id) {
      const { syncGroupCoversAndCount } = await import('../_lib/groups.js');
      await syncGroupCoversAndCount(supabase, [photoData.group_id]);
    }
    
    let dissolvedGroupId: string | undefined;
    if (photoData) {
      if (photoData.image_url) {
        // Physical Cleanup logic could be handled here or deferred.
        // For simplicity, returning photoData to client to handle it as it does now
      }
    }
    return c.json({ success: true, data: { photoData } });
  })
  .post('/ai-result', async (c) => {
    const { payload } = await c.req.json();
    const supabase = await getSupabaseAdmin();
    // Save raw response and parsed data to system_logs.metadata per architecture rules
    const { data, error } = await supabase.from('system_logs').insert({
        error_message: `AI analysis completed for photo ${payload.photo_id}`,
        context: 'AI_Executor',
        metadata: {
            action: 'analyze_photo',
            level: 'info',
            photo_id: payload.photo_id,
            raw_result: payload.raw_result,
            parsed_data: payload.parsed_data
        },
        created_at: payload.created_at || new Date().toISOString()
    }).select().maybeSingle();
    
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data });
  });
