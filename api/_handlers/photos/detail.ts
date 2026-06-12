import { Hono } from 'hono';
import { type } from 'arktype';
import { getSupabaseAdmin } from '../../_lib/supabase.js';
import { PhotoIdsReqSchema, PhotoCheckHashReqSchema } from '../../_shared/apiContractSchema.js';

const TABLE_NAME = 'furniture_items';

export const detailHandler = (app: Hono) => {
  app.post('/by-ids', async (c) => {
    const body = await c.req.json();
    const check = PhotoIdsReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { ids } = check;
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase.from(TABLE_NAME).select('*, photo_tags(tag_id)').in('id', ids);
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data: data || [] });
  });

  app.post('/without-thumb-hash', async (c) => {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase.from(TABLE_NAME).select('id').is('thumb_hash', null);
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data: data || [] });
  });

  app.post('/check-hash', async (c) => {
    const body = await c.req.json();
    const check = PhotoCheckHashReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { hash } = check;
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase.from(TABLE_NAME).select('image_url, manual_code').eq('image_hash', hash).limit(1).maybeSingle();
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data });
  });
};
