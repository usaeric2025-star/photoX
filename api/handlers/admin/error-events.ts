import { Hono } from 'hono';
import { getSupabaseAdmin } from "../../lib/supabase.js";

export const adminErrorEvents = new Hono();

adminErrorEvents.get("/error-events", async (c) => {
    try {
        const supabase = await getSupabaseAdmin();
        const { data, error } = await supabase
            .from('error_events')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return c.json({ success: true, data });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

adminErrorEvents.post("/error-events-clear", async (c) => {
    try {
        const supabase = await getSupabaseAdmin();
        const { error } = await supabase
            .from('error_events')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});
