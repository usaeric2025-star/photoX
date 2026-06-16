import { supabase } from '../src/lib/supabase';
const run = async () => {
    const { data, error } = await supabase.from('groups').select('*').limit(1);
    console.log(Object.keys(data?.[0] || {}));
};
run();
