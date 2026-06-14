import { getSupabaseAdmin } from "./api/_lib/supabase.js";
async function main() {
    const supabase = await getSupabaseAdmin();
    const { data } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(2);
    console.log(data);
}
main();
