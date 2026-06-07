import { Hono } from 'hono';
import { getSupabaseAdmin } from "../../lib/supabase.js";

export const adminMaintenance = new Hono();

adminMaintenance.get("/jobs", async (c) => {
    try {
        const supabase = await getSupabaseAdmin();
        const { data, error } = await supabase.from('maintenance_jobs').select('*');
        if (error) throw error;
        return c.json({ success: true, data });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

adminMaintenance.get("/job/:jobId", async (c) => {
    try {
        const { jobId } = c.req.param();
        const supabase = await getSupabaseAdmin();
        const { data, error } = await supabase.from('maintenance_jobs').select('*').eq('id', jobId).single();
        if (error) throw error;
        return c.json({ success: true, data });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

adminMaintenance.post("/member-count-mismatch/preview", async (c) => {
    return c.json({ success: true, preview: [] });
});

adminMaintenance.post("/missing-hash/preview", async (c) => {
    return c.json({ success: true, preview: [] });
});
