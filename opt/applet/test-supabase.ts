import { supabase } from './src/lib/supabase';
async function test() {
  const res = await supabase.from('furniture_items').select('id, name, tag_ids, description').limit(1);
  console.log('Error:', res.error);
  console.log('Data:', res.data);
}
test();
