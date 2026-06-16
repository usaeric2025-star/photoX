import { getSupabaseAdmin } from '../api/_lib/supabase';
const run = async () => {
    const supabase = await getSupabaseAdmin();
    // try to insert with staff
    const { error: e1 } = await supabase.from('furniture_items').insert({ id: 'd9b9b9b9-9b9b-9b9b-9b9b-9b9b9b9b9b9b', user_id: 'staff', name: 'test' });
    console.log("Error staff photo user_id:", e1?.message);
};
run();
