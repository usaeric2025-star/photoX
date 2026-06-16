import { Hono } from 'hono';
import { type } from 'arktype';
import { getSupabaseAdmin } from '../../_lib/supabase.js';
import { PhotoBatchUpdateReqSchema, PhotoUpdateReqSchema } from '../../_shared/apiContractSchema.js';

const TABLE_NAME = 'furniture_items';

export const updateHandler = (app: Hono) => {
  app.post('/batch-update', async (c) => {
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
    
    return c.json({ success: true, data: data?.map((d: { id: string }) => d.id) || [] });
  });

  app.post('/update', async (c) => {
    const body = await c.req.json();
    const check = PhotoUpdateReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { id, updates } = check;
    const supabase = await getSupabaseAdmin();
    
    // Fetch snapshot before update to track if group is changing
    const { data: beforeUpdate } = await supabase.from(TABLE_NAME).select('group_id').eq('id', id).maybeSingle();

    // Special handling for group cover (optimistic quick update)
    const updateObj = updates as Record<string, unknown>;
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
      const { syncGroupCoversAndCount } = await import('../../_lib/groups.js');
      await syncGroupCoversAndCount(supabase, affectedGroupIds);
    }

    return c.json({ success: true });
  });
};
