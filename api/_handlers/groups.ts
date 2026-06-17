import { Hono } from 'hono';
import { type } from 'arktype';
import { getSupabaseAdmin } from '../_lib/supabase.js';
import { GroupReqSchema } from '../_shared/apiContractSchema.js';

const TABLE_NAME = 'groups';

export const groups = new Hono()
  .post('/', async (c) => {
    const body = await c.req.json();
    const check = type({ groupData: GroupReqSchema })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { groupData } = check;
    const supabase = await getSupabaseAdmin();
    // Simplified: Assuming validation and mapToDb logic handled or simplified here
    const { error, data } = await supabase
        .from(TABLE_NAME)
        .insert(groupData)
        .select()
        .single();
    if (error) {
      const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      import('./logger.js').then(({ logger }) => logger.error("[Groups] Insert group failed", { error: error.message, traceId }));
      return c.json({ success: false, error: error.message, traceId }, 500);
    }
    return c.json({ success: true, data });
  })
  .put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const check = type({ updates: GroupReqSchema.omit("id") })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { updates } = check;
    delete (updates as any).member_count;

    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) {
      const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      import('./logger.js').then(({ logger }) => logger.error("[Groups] Update group failed", { error: error.message, id, traceId }));
      return c.json({ success: false, error: error.message, traceId }, 500);
    }
    return c.json({ success: true, data });
  })
  .post('/upsert', async (c) => {
    const dbUpdates = await c.req.json();
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase.from(TABLE_NAME).upsert(dbUpdates, { onConflict: 'id' });
    if (error) {
      const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      import('./logger.js').then(({ logger }) => logger.error("[Groups] Upsert failed", { error: error.message, traceId }));
      return c.json({ success: false, error: error.message, traceId }, 500);
    }
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
    if (error) {
      const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      import('./logger.js').then(({ logger }) => logger.error("[Groups] Delete failed", { error: error.message, id, traceId }));
      return c.json({ success: false, error: error.message, traceId }, 500);
    }
    return c.json({ success: true });
  })
  .post('/group-photos', async (c) => {
      const body = await c.req.json();
      const check = type({
          targetGroupId: "string",
          userId: "string",
          "photoIds?": "string[]",
          groupData: GroupReqSchema,
          "sourceGroupIds?": "string[]",
          "ungroupedValidIds?": "string[]"
      })(body);
      if (check instanceof type.errors) throw new Error(check.summary);

      const { 
          targetGroupId, 
          userId, 
          groupData, 
          photoIds
      } = check;
      delete (groupData as any).member_count;
      
      const supabase = await getSupabaseAdmin();

      // Optimize: Compute sourceGroupIds and ungroupedValidIds directly on the server to save client roundtrip
      let sourceGroupIds: string[] = [];
      let ungroupedValidIds: string[] = [];
      let dbUserId: string | null = null;
      if (photoIds && photoIds.length > 0) {
        const { data: sourcePhotos } = await supabase.from('furniture_items').select('id, group_id, user_id').in('id', photoIds);
        const photosArr = sourcePhotos || [];
        if (photosArr.length > 0) {
             dbUserId = photosArr[0].user_id;
        }
        sourceGroupIds = Array.from(new Set(
          photosArr.map((p: { group_id: string | null }) => p.group_id).filter((gid: string | null | undefined): gid is string => !!gid && gid !== targetGroupId)
        )) as string[];
        ungroupedValidIds = photoIds.filter(id => {
          const p = photosArr.find((x: { id: string }) => x.id === id);
          return !p?.group_id;
        });
      }

      const { data: checkData } = await supabase.from('groups').select('id').eq('id', targetGroupId).maybeSingle();

      let err;
      if (!checkData) {
        const insertData: Record<string, unknown> = {
          id: targetGroupId,
          is_hidden: false,
          created_at: new Date().toISOString(),
          ...groupData
        };
        
        let finalUserId = (userId !== 'staff' && userId) ? userId : dbUserId;
        if (!finalUserId) {
           const { data: userRecord } = await supabase.from('users').select('id').limit(1).maybeSingle();
           finalUserId = userRecord?.id || '8ec53131-a589-4b50-beb4-6b5308541e1b';
         }
        insertData.user_id = finalUserId;

        console.log("LOG: Inserting into groups:", insertData);
        const { error, data } = await supabase.from('groups').insert(insertData).select('id');
        err = error;
        if (!error && (!data || data.length === 0)) {
           err = new Error("Group insert succeeded but returned no rows! Insert might have been silently ignored.");
         }
      } else {
        console.log("LOG: Updating group:", targetGroupId, groupData);
        const { error } = await supabase.from('groups').update(groupData).eq('id', targetGroupId);
        err = error;
      }
      if (err) {
        const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        import('./logger.js').then(({ logger }) => logger.error("[groupPhotos] Group DB operation failed", { error: err.message, traceId }));
        return c.json({ success: false, error: err.message, traceId }, 500);
      }

      // Update photos FIRST before merging or syncing to ensure the target group has all new members
      // and won't be dissolved prematurely if member count is momentarily <= 1
      if (ungroupedValidIds && ungroupedValidIds.length > 0) {
        console.log("LOG: Updating photo group_ids inside furniture_items:", ungroupedValidIds, "->", targetGroupId);
        const { error } = await supabase
          .from('furniture_items')
          .update({ group_id: targetGroupId, is_group_cover: false })
          .in('id', ungroupedValidIds);
        if (error) {
          const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
          import('./logger.js').then(({ logger }) => logger.error("[groupPhotos] Photo group_id update failed", { error: error.message, traceId, ungroupedValidIds }));
          return c.json({ success: false, error: error.message, traceId }, 500);
        }
      }

      // Merge
      if (sourceGroupIds && sourceGroupIds.length > 0) {
        console.log("LOG: Merging groups:", sourceGroupIds, "->", targetGroupId);
        const { error } = await supabase.rpc('merge_groups', {
          source_group_ids: sourceGroupIds,
          target_group_id: targetGroupId
        });
        if (error) {
          const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
          import('./logger.js').then(({ logger }) => logger.error("[groupPhotos] Merge RPC call failed", { error: error.message, traceId, sourceGroupIds, targetGroupId }));
          return c.json({ success: false, error: error.message, traceId }, 500);
        }
      }

      // Reconcile and synchronize
      const affectedGroupIds = [targetGroupId];
      if (sourceGroupIds) {
        sourceGroupIds.forEach((id: string) => affectedGroupIds.push(id));
      }
      console.log("LOG: Reconciling groups:", affectedGroupIds);
      const { syncGroupCoversAndCount } = await import('../_lib/groups.js');
      await syncGroupCoversAndCount(supabase, affectedGroupIds);

      return c.json({ success: true });
  })
  .post('/move-photos', async (c) => {
    const body = await c.req.json();
    const check = type({ photoIds: "string[]", targetGroupId: "string|null" })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { photoIds, targetGroupId } = check;
    const supabase = await getSupabaseAdmin();

    // Fetch snapshots before move
    const { data: sourcePhotos } = await supabase.from('furniture_items').select('group_id').in('id', photoIds);
    const affectedGroupIds = (sourcePhotos || []).map((p: { group_id: string | null }) => p.group_id).filter((gid: string | null | undefined): gid is string => !!gid);
    if (targetGroupId) {
      affectedGroupIds.push(targetGroupId);
    }

    const { error } = await supabase.rpc('move_photos_to_group', {
      photo_ids: photoIds,
      target_group_id: targetGroupId
    });
    if (error) {
      const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      import('./logger.js').then(({ logger }) => logger.error("[movePhotos] RPC move_photos_to_group failed", { error: error.message, traceId, photoIds, targetGroupId }));
      return c.json({ success: false, error: error.message, traceId }, 500);
    }

    // Reconcile groups
    const { syncGroupCoversAndCount } = await import('../_lib/groups.js');
    await syncGroupCoversAndCount(supabase, affectedGroupIds);

    return c.json({ success: true });
  })
  .post('/set-cover', async (c) => {
    const body = await c.req.json();
    const check = type({ photoId: "string|null", groupId: "string" })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { photoId, groupId } = check;
    const supabase = await getSupabaseAdmin();
    await supabase.from('furniture_items').update({ is_group_cover: false }).eq('group_id', groupId);
    if (photoId) {
        await supabase.from('furniture_items').update({ is_group_cover: true }).eq('id', photoId);
    }
    const { error } = await supabase.from('groups').update({ cover_photo_id: photoId || null }).eq('id', groupId);
    if (error) {
      const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      import('./logger.js').then(({ logger }) => logger.error("[setCover] Cover image update failed on groups table", { error: error.message, traceId, photoId, groupId }));
      return c.json({ success: false, error: error.message, traceId }, 500);
    }

    // Keep strict integrity
    const { syncGroupCoversAndCount } = await import('../_lib/groups.js');
    await syncGroupCoversAndCount(supabase, [groupId]);

    return c.json({ success: true });
  })
  .post('/ungroup', async (c) => {
    const body = await c.req.json();
    const check = type({ groupId: "string" })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { groupId } = check;
    const supabase = await getSupabaseAdmin();
    await supabase.from('furniture_items').update({ group_id: null, is_group_cover: false }).eq('group_id', groupId);
    const { error } = await supabase.rpc('dissolve_group', { group_id: groupId });
    if (error) {
      const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      import('./logger.js').then(({ logger }) => logger.error("[ungroup] Dissolve group RPC failed", { error: error.message, traceId, groupId }));
      return c.json({ success: false, error: error.message, traceId }, 500);
    }
    return c.json({ success: true });
  })
  .post('/sync-count', async (c) => {
    const body = await c.req.json();
    const check = type({ groupId: "string" })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { groupId } = check;
    if (!groupId) return c.json({ success: true });
    const supabase = await getSupabaseAdmin();
    
    const { syncGroupCoversAndCount } = await import('../_lib/groups.js');
    await syncGroupCoversAndCount(supabase, [groupId]);
    
    return c.json({ success: true });
  })
  .post('/repair-integrity', async (c) => {
    const supabase = await getSupabaseAdmin();
    const { data: groups, error: groupsError } = await supabase.from('groups').select('id');
    if (groupsError) {
      const traceId = "TR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      import('./logger.js').then(({ logger }) => logger.error("[repairIntegrity] Fetch groups failed", { error: groupsError.message, traceId }));
      return c.json({ success: false, error: groupsError.message, traceId }, 500);
    }

    let dissolved = 0;
    let synced = 0;
    let deleted = 0;

    for (const group of (groups || [])) {
      const { count, error: countError } = await supabase
        .from('furniture_items')
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
        synced++;
      }
    }

    return c.json({ success: true, data: { dissolved, synced, deleted } });
  });
