import { getSupabaseAdmin } from "./api/_lib/supabase.js";
import { logger } from "./api/_lib/logger.js";

async function main() {
    try {
        const supabase = await getSupabaseAdmin();
        const { data, error } = await supabase.from('system_logs').select('*').limit(1);
        console.log("system_logs table result:", { data, error });
    } catch (e) {
        console.error("Exception:", e);
    }
}
main();
