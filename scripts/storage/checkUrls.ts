import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);
async function run() {
  const { data: r2 } = await supabase.from('furniture_items').select('id').like('thumb_url', '%r2.dev%');
  const { data: supa } = await supabase.from('furniture_items').select('id').like('thumb_url', '%supabase.co%');
  console.log(`R2 Thumb URLs: ${r2?.length || 0}`);
  console.log(`Supabase Thumb URLs: ${supa?.length || 0}`);
}
run();
