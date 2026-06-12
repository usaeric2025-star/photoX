import { Hono } from 'hono';
import { type } from 'arktype';
import { getSupabaseAdmin } from '../_lib/supabase.js';
import { TagReqSchema } from '../_shared/apiContractSchema.js';

const TABLE_NAME = 'tags';

export const tags = new Hono()
  .put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const check = type({ updates: TagReqSchema.omit("id") })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { updates } = check;
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase.from(TABLE_NAME).update(updates).eq('id', id);
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true });
  })
  .post('/', async (c) => {
    const body = await c.req.json();
    const check = type({ tagData: TagReqSchema })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { tagData } = check;
    const supabase = await getSupabaseAdmin();
    const { error, data } = await supabase.from(TABLE_NAME).insert(tagData).select().single();
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data });
  })
  .post('/batch', async (c) => {
    const body = await c.req.json();
    const check = type({ tags: TagReqSchema.array() })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { tags: tagsData } = check;
    const supabase = await getSupabaseAdmin();
    const { error, data } = await supabase.from(TABLE_NAME).insert(tagsData).select('id, name');
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data });
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true });
  })
  .post('/refresh-hot-scores', async (c) => {
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase.rpc('refresh_tag_hot_scores');
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true });
  })
  .post('/remove-from-photo', async (c) => {
    const body = await c.req.json();
    const check = type({ photoId: "string", tagId: "string" })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { photoId, tagId } = check;
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase.from('photo_tags').delete().eq('photo_id', photoId).eq('tag_id', tagId);
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true });
  })
  .post('/sync-photo-tags', async (c) => {
    const body = await c.req.json();
    const check = type({ photoId: "string", tagIds: "string[]" })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { photoId, tagIds } = check;
    const supabase = await getSupabaseAdmin();
    const { error: deleteError } = await supabase.from('photo_tags').delete().eq('photo_id', photoId);
    if (deleteError) return c.json({ success: false, error: deleteError.message }, 500);

    const limitedTagIds = tagIds.slice(0, 10);
    if (limitedTagIds.length > 0) {
        const associations = limitedTagIds.map((tagId: string) => ({ photo_id: photoId, tag_id: tagId }));
        const { error: insertError } = await supabase.from('photo_tags').insert(associations);
        if (insertError) return c.json({ success: false, error: insertError.message }, 500);
    }
    return c.json({ success: true });
  })
  .post('/sync-batch-photo-tags', async (c) => {
    const body = await c.req.json();
    const check = type({ photoIds: "string[]", tagIds: "string[]" })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { photoIds, tagIds } = check;
    const supabase = await getSupabaseAdmin();
    const { error: deleteError } = await supabase.from('photo_tags').delete().in('photo_id', photoIds);
    if (deleteError) return c.json({ success: false, error: deleteError.message }, 500);

    const limitedTagIds = tagIds.slice(0, 10);
    if (limitedTagIds.length > 0) {
        const associations = photoIds.flatMap((photoId: string) => 
            limitedTagIds.map((tagId: string) => ({ photo_id: photoId, tag_id: tagId }))
        );
        const { error: insertError } = await supabase.from('photo_tags').insert(associations);
        if (insertError) return c.json({ success: false, error: insertError.message }, 500);
    }
    return c.json({ success: true });
  });
