import { Hono } from 'hono';
import { getSupabaseAdmin } from "../../lib/supabase.js";

export const adminMaintenance = new Hono();

adminMaintenance.post("/daily-cleanup", async (c) => {
    try {
        const supabase = await getSupabaseAdmin();
        
        // 1. Clean up old system logs (older than 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { error: logError } = await supabase
            .from('system_logs')
            .delete()
            .lt('created_at', thirtyDaysAgo.toISOString());

        // 2. Clear old audit logs (older than 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        
        const { error: auditError } = await supabase
            .from('ai_audit_logs')
            .delete()
            .lt('created_at', ninetyDaysAgo.toISOString());

        if (logError || auditError) {
            console.error('[Maintenance] Cleanup partially failed', { logError, auditError });
        }

        return c.json({ 
            success: true, 
            message: 'Daily cleanup executed',
            timestamp: new Date().toISOString()
        });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

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
