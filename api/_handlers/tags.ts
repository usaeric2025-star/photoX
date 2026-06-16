import { Hono } from 'hono';
import { type } from 'arktype';
import { getSupabaseAdmin } from '../_lib/supabase.js';
import { TagReqSchema } from '../_shared/apiContractSchema.js';

const TABLE_NAME = 'tags';

export const tags = new Hono()
  .get('/search', async (c) => {
    const keyword = c.req.query('keyword') || '';
    const supabase = await getSupabaseAdmin();
    
    let query = supabase.from(TABLE_NAME).select('*').order('name').order('id');
    if (keyword) {
        query = query.ilike('name', `%${keyword}%`);
    }
    const { data, error } = await query.limit(20);
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data });
  })
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
    const check = type({ 
      photoId: "string", 
      tagIds: "string[]",
      "tagWeights?": "Record<string, number>",
      "tagSources?": "Record<string, 'ai' | 'user' | 'system'>"
    })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { photoId, tagIds, tagWeights, tagSources } = check;
    const supabase = await getSupabaseAdmin();

    // 1. Fetch current associations to determine chronological age (tie-breaker)
    const { data: currentAssociations } = await supabase.from('photo_tags').select('tag_id').eq('photo_id', photoId);
    const existingTagIds = new Set((currentAssociations || []).map((pt: { tag_id: string }) => String(pt.tag_id)));

    // 2. Query target tags to resolve is_global property for default weights
    const { data: tagDetails } = await supabase.from('tags').select('id, is_global').in('id', tagIds);
    const tagDetailsMap = new Map<string, { id: string; is_global: boolean }>((tagDetails || []).map((t: { id: string; is_global: boolean }) => [String(t.id), t]));

    const getWeight = (tagId: string, tagDetail?: { id: string; is_global: boolean }) => {
      if (tagWeights && tagWeights[tagId] !== undefined) {
        return tagWeights[tagId];
      }
      if (tagSources && tagSources[tagId]) {
        const src = tagSources[tagId];
        if (src === 'ai') return 100;
        if (src === 'user') return 90;
        if (src === 'system') return 50;
      }
      if (tagDetail) {
        if (tagDetail.is_global) return 50;
      }
      return 90; // Default fallback to user manual tag
    };

    // 3. Sort by computed weight, and on ties, preserve oldest
    const sortedTagIds = [...tagIds].sort((a, b) => {
      const weightA = getWeight(a, tagDetailsMap.get(a));
      const weightB = getWeight(b, tagDetailsMap.get(b));
      if (weightB !== weightA) {
        return weightB - weightA;
      }
      const isAExisting = existingTagIds.has(a);
      const isBExisting = existingTagIds.has(b);
      if (isAExisting && !isBExisting) return -1;
      if (!isAExisting && isBExisting) return 1;
      return tagIds.indexOf(a) - tagIds.indexOf(b);
    });

    const limitedTagIds = sortedTagIds.slice(0, 3);

    const { error: deleteError } = await supabase.from('photo_tags').delete().eq('photo_id', photoId);
    if (deleteError) return c.json({ success: false, error: deleteError.message }, 500);

    if (limitedTagIds.length > 0) {
        const associations = limitedTagIds.map((tagId: string) => ({ photo_id: photoId, tag_id: tagId }));
        const { error: insertError } = await supabase.from('photo_tags').insert(associations);
        if (insertError) return c.json({ success: false, error: insertError.message }, 500);
    }
    return c.json({ success: true });
  })
  .post('/sync-batch-photo-tags', async (c) => {
    const body = await c.req.json();
    const check = type({ 
      photoIds: "string[]", 
      tagIds: "string[]",
      "tagWeights?": "Record<string, number>",
      "tagSources?": "Record<string, 'ai' | 'user' | 'system'>"
    })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { photoIds, tagIds, tagWeights, tagSources } = check;
    const supabase = await getSupabaseAdmin();

    // Query target tags to resolve is_global property for default weights
    const { data: tagDetails } = await supabase.from('tags').select('id, is_global').in('id', tagIds);
    const tagDetailsMap = new Map<string, { id: string; is_global: boolean }>((tagDetails || []).map((t: { id: string; is_global: boolean }) => [String(t.id), t]));

    const getWeight = (tagId: string, tagDetail?: { id: string; is_global: boolean }) => {
      if (tagWeights && tagWeights[tagId] !== undefined) {
        return tagWeights[tagId];
      }
      if (tagSources && tagSources[tagId]) {
        const src = tagSources[tagId];
        if (src === 'ai') return 100;
        if (src === 'user') return 90;
        if (src === 'system') return 50;
      }
      if (tagDetail) {
        if (tagDetail.is_global) return 50;
      }
      return 90;
    };

    // Sort by computed weight
    const sortedTagIds = [...tagIds].sort((a, b) => {
      const weightA = getWeight(a, tagDetailsMap.get(a));
      const weightB = getWeight(b, tagDetailsMap.get(b));
      if (weightB !== weightA) {
        return weightB - weightA;
      }
      return tagIds.indexOf(a) - tagIds.indexOf(b);
    });

    const limitedTagIds = sortedTagIds.slice(0, 3);

    const { error: deleteError } = await supabase.from('photo_tags').delete().in('photo_id', photoIds);
    if (deleteError) return c.json({ success: false, error: deleteError.message }, 500);

    if (limitedTagIds.length > 0) {
        const associations = photoIds.flatMap((photoId: string) => 
            limitedTagIds.map((tagId: string) => ({ photo_id: photoId, tag_id: tagId }))
        );
        const { error: insertError } = await supabase.from('photo_tags').insert(associations);
        if (insertError) return c.json({ success: false, error: insertError.message }, 500);
    }
    return c.json({ success: true });
  });
