import { getSupabaseAdmin } from '../api/_lib/supabase';
const run = async () => {
    const supabase = await getSupabaseAdmin();
    const { error: e3 } = await supabase.from('furniture_items').insert({ id: '00000000-0000-0000-0000-000000000001', user_id: '00000000-0000-0000-0000-000000000000', name: 't', image_url: 'https://test.com/img.jpg', image_hash: '123' });
    console.log("Insert into furniture_items with dummy user_id:", e3);
    
    await supabase.from('furniture_items').delete().eq('id', '00000000-0000-0000-0000-000000000001');

};
run();
