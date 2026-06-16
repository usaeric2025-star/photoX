import { getSupabaseAdmin } from '../api/_lib/supabase';
const run = async () => {
    const supabase = await getSupabaseAdmin();
    const { data: photos } = await supabase.from('furniture_items').select('user_id').limit(10);
    console.log("Photo user_ids:", [...new Set(photos?.map(p => p.user_id))]);
    
    const { data: groups } = await supabase.from('groups').select('user_id').limit(10);
    console.log("Group user_ids:", [...new Set(groups?.map(p => p.user_id))]);
};
run();
