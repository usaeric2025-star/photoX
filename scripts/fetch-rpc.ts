import { getSupabaseAdmin } from '../api/_lib/supabase.js';

const run = async () => {
    const supabase = await getSupabaseAdmin();
    // execute an arbitrary function that fetches the definition of merge_groups
    // e.g. using a postgres built-in. pg_get_functiondef
    // Or just selecting from information_schema.routines
    const { data: res, error } = await supabase.from('pg_proc' as any).select('prosrc').eq('proname', 'merge_groups');
    console.log(error || res);
};
run();
