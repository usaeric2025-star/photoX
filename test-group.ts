import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, serviceKey);

async function test() {
  const groupId = '62a6d0d4-5fc4-4494-8b27-397bde05c63d';
  console.log(`Checking furniture_items for group_id: ${groupId}`);
  
  const { data, error } = await supabase
    .from('furniture_items')
    .select('id, name, is_analyzing, description, image_url, category_id')
    .eq('group_id', groupId);
    
  if (error) {
    console.error("Error querying furniture_items:", error);
  } else {
    console.log(`Found ${data?.length} items.`);
    console.log(JSON.stringify(data, null, 2));
  }
}

test();
