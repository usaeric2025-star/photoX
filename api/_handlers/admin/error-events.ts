import { Hono } from 'hono';
import { getSupabaseAdmin } from "../../_lib/supabase.js";

export const adminErrorEvents = new Hono();

adminErrorEvents.get("/error-events", async (c) => {
    try {
        const supabase = await getSupabaseAdmin();
        const { data, error } = await supabase
            .from('system_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(300);
        if (error) throw error;
        return c.json({ success: true, data });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

adminErrorEvents.post("/error-events-clear", async (c) => {
    try {
        const supabase = await getSupabaseAdmin();
        // Use a filter that matches all rows
        const { error } = await supabase
            .from('system_logs')
            .delete()
            .neq('id', -1);
        if (error) throw error;
        return c.json({ success: true });
    } catch (e: any) {
        console.error('[Admin] Clear logs failed:', e);
        return c.json({ success: false, error: e.message }, 500);
    }
});
