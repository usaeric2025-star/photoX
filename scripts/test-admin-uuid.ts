import { getSupabaseAdmin } from '../api/_lib/supabase';
const run = async () => {
    const supabase = await getSupabaseAdmin();
    // try to insert with real uuid
    const { error: e1 } = await supabase.from('groups').insert({ id: 'd9b9b9b9-9b9b-9b9b-9b9b-9b9b9b9b9b9a', user_id: '8ec53131-a589-4b50-beb4-6b5308541e1b', name: {zh:'test'} });
    console.log("Error real user:", e1?.message);
    await supabase.from('groups').delete().eq('id', 'd9b9b9b9-9b9b-9b9b-9b9b-9b9b9b9b9b9a');
};
run();
