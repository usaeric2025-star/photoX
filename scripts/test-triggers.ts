import { getSupabaseAdmin } from '../api/_lib/supabase.js';

const run = async () => {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase.rpc('execute_sql_query', { query: `
      SELECT event_manipulation, action_statement FROM information_schema.triggers WHERE event_object_table = 'groups';
    `});
    console.log(error || data);
};
run();
