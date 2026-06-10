import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const groupId = '62a6d0d4-5fc4-4494-8b27-397bde05c63d';
  console.log(`Checking product_groups for id: ${groupId}`);
  
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, description')
    .eq('id', groupId);
    
  if (error) {
    console.error('Error querying product_groups:', error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}
run();
