import { Hono } from 'hono';
import { type } from 'arktype';
import { getSupabaseAdmin } from '../../_lib/supabase.js';
import { PhotoIdReqSchema } from '../../_shared/apiContractSchema.js';

const TABLE_NAME = 'furniture_items';

export const deleteHandler = (app: Hono) => {
  app.post('/delete', async (c) => {
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
      const { syncGroupCoversAndCount } = await import('../../_lib/groups.js');
      await syncGroupCoversAndCount(supabase, [photoData.group_id]);
    }
    
    return c.json({ success: true, data: { photoData } });
  });
};
