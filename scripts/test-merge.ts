import { getSupabaseAdmin } from '../api/_lib/supabase';
const run = async () => {
    const supabase = await getSupabaseAdmin();
    // Test if the rpc signature works (with fake ids to just check if the function exists)
    const { error: e3 } = await supabase.rpc('merge_groups', { source_group_ids: ['d9b9b9b9-9b9b-9b9b-9b9b-9b9b9b9b9b9a'], target_group_id: 'd9b9b9b9-9b9b-9b9b-9b9b-9b9b9b9b9b9b' });
    console.log("Merge group execution test:", e3?.message);

};
run();
