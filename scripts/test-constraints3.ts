import { getSupabaseAdmin } from '../api/_lib/supabase.js';

const run = async () => {
    const supabase = await getSupabaseAdmin();
    const { error: e3 } = await supabase.from('furniture_items').insert({ id: '00000000-0000-0000-0000-000000000001', user_id: '8ec53131-a589-4b50-beb4-6b5308541e1b', name: 't', image_url: 'https://test.com/img.jpg', image_hash: '123', group_id: '00000000-0000-0000-0000-000000000002' });
    console.log(e3);
};
run();
