import { Hono } from 'hono';
import { getSupabaseAdmin } from '../_lib/supabase.js';

const TABLE_NAME = 'groups';

export const groups = new Hono()
  .post('/', async (c) => {
    const { groupData } = await c.req.json();
    const supabase = await getSupabaseAdmin();
    // Simplified: Assuming validation and mapToDb logic handled or simplified here
    const { error, data } = await supabase
        .from(TABLE_NAME)
        .insert(groupData)
        .select()
        .single();
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data });
  })
  .put('/:id', async (c) => {
    const id = c.req.param('id');
    const { updates } = await c.req.json();
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data });
  })
  .post('/upsert', async (c) => {
    const dbUpdates = await c.req.json();
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase.from(TABLE_NAME).upsert(dbUpdates, { onConflict: 'id' });
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true });
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    // Ungroup photos handled by client/other API for now before deleting
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true });
  })
  .post('/group-photos', async (c) => {
      const { 
          targetGroupId, 
          userId, 
          photoIds, 
          groupData, 
          sourceGroupIds, 
          ungroupedValidIds 
      } = await c.req.json();
      
      const supabase = await getSupabaseAdmin();

      const { data: checkData } = await supabase.from('groups').select('id').eq('id', targetGroupId).maybeSingle();

      let err;
      if (!checkData) {
        const { error } = await supabase.from('groups').insert({
          id: targetGroupId,
          user_id: userId,
          is_hidden: false,
          created_at: new Date().toISOString(),
          ...groupData
        });
        err = error;
      } else {
        const { error } = await supabase.from('groups').update(groupData).eq('id', targetGroupId);
        err = error;
      }
      if (err) return c.json({ success: false, error: err.message }, 500);

      // Merge
      if (sourceGroupIds && sourceGroupIds.length > 0) {
        const { error } = await supabase.rpc('merge_groups', {
          source_group_ids: sourceGroupIds,
          target_group_id: targetGroupId
        });
        if (error) return c.json({ success: false, error: error.message }, 500);
      }

      // Update photos
      if (ungroupedValidIds && ungroupedValidIds.length > 0) {
        const { error } = await supabase
          .from('furniture_items')
          .update({ group_id: targetGroupId, is_group_cover: false })
          .in('id', ungroupedValidIds);
        if (error) return c.json({ success: false, error: error.message }, 500);
      }

      return c.json({ success: true });
  })
  .post('/move-photos', async (c) => {
    const { photoIds, targetGroupId } = await c.req.json();
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase.rpc('move_photos_to_group', {
      photo_ids: photoIds,
      target_group_id: targetGroupId
    });
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true });
  })
  .post('/set-cover', async (c) => {
    const { photoId, groupId } = await c.req.json();
    const supabase = await getSupabaseAdmin();
    await supabase.from('furniture_items').update({ is_group_cover: false }).eq('group_id', groupId);
    if (photoId) {
        await supabase.from('furniture_items').update({ is_group_cover: true }).eq('id', photoId);
    }
    const { error } = await supabase.from('groups').update({ cover_photo_id: photoId || null }).eq('id', groupId);
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true });
  })
  .post('/ungroup', async (c) => {
    const { groupId } = await c.req.json();
    const supabase = await getSupabaseAdmin();
    await supabase.from('furniture_items').update({ group_id: null, is_group_cover: false }).eq('group_id', groupId);
    const { error } = await supabase.rpc('dissolve_group', { group_id: groupId });
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true });
  })
  .post('/sync-count', async (c) => {
    const { groupId } = await c.req.json();
    if (!groupId) return c.json({ success: true });
    const supabase = await getSupabaseAdmin();
    const { count } = await supabase.from('furniture_items').select('id', { count: 'exact', head: true }).eq('group_id', groupId);
    const { error } = await supabase.from('groups').update({ member_count: count || 0 }).eq('id', groupId);
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true });
  })
  .post('/repair-integrity', async (c) => {
    const supabase = await getSupabaseAdmin();
    const { data: groups, error: groupsError } = await supabase.from('groups').select('id');
    if (groupsError) return c.json({ success: false, error: groupsError.message }, 500);

    let dissolved = 0;
    let synced = 0;
    let deleted = 0;

    for (const group of (groups || [])) {
      const { count, error: countError } = await supabase
        .from(TABLE_NAME)
        .select('id', { count: 'exact', head: true })
        .eq('group_id', group.id);

      if (countError) continue;

      const actualCount = count || 0;

      if (actualCount <= 1) {
        if (actualCount === 1) {
          await supabase
            .from(TABLE_NAME)
            .update({ group_id: null, is_group_cover: false, is_pinned: false })
            .eq('group_id', group.id);
          dissolved++;
        }
        await supabase.from('groups').delete().eq('id', group.id);
        deleted++;
      } else {
        await supabase
          .from('groups')
          .update({ member_count: actualCount })
          .eq('id', group.id);
        synced++;
      }
    }

    return c.json({ success: true, data: { dissolved, synced, deleted } });
  });
