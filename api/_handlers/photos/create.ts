import { Hono } from 'hono';
import { getSupabaseAdmin } from '../../_lib/supabase.js';

const TABLE_NAME = 'furniture_items';

export const createHandler = (app: Hono) => {
  app.post('/upsert', async (c) => {
    const { payload } = await c.req.json() as { payload: Record<string, unknown> };
    const supabase = await getSupabaseAdmin();

    // Fix user_id if it is 'staff' or missing (avoids invalid input syntax for type uuid)
    if (!payload.user_id || payload.user_id === 'staff') {
        const { data: userRecord } = await supabase.from('users').select('id').limit(1).maybeSingle();
        payload.user_id = userRecord?.id || '8ec53131-a589-4b50-beb4-6b5308541e1b';
    }

    const { data, error } = await supabase.from(TABLE_NAME).upsert(payload, { onConflict: 'id' }).select('id').maybeSingle();
    if (error) return c.json({ success: false, error: error.message }, 500);

    // If upsert introduced a group_id, reconcile
    if (payload.group_id) {
      const { syncGroupCoversAndCount } = await import('../../_lib/groups.js');
      await syncGroupCoversAndCount(supabase, [String(payload.group_id)]);
    }

    return c.json({ success: true, data });
  });

  app.post('/ai-result', async (c) => {
    const { payload } = await c.req.json() as { payload: Record<string, unknown> };
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
};
