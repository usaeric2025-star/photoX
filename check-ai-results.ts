import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  const photoIds = [
    'cff3c1c7-d641-4144-9bff-fa2677d527e4',
    '935e1a10-9655-4f62-8779-f7204c7f1025',
    'ed28448e-fe47-40dd-8883-d9ef04bd8698'
  ];

  console.log('Querying photo_ai_results...\\n');
  const { data, error } = await supabase
    .from('photo_ai_results')
    .select('*')
    .in('photo_id', photoIds);

  if (error) {
    console.error('Error fetching photo_ai_results:', error);
    return;
  }

  console.log(`Found ${data?.length} results in photo_ai_results:`);
  for (const item of (data || [])) {
    console.log('----------------------------------------------------');
    console.log(`Photo ID: ${item.photo_id}`);
    console.log(`Created At: ${item.created_at}`);
    console.log(`Parsed Data:`, JSON.stringify(item.parsed_data || {}, null, 1));
    console.log(`Raw Result Text:`, item.raw_result ? item.raw_result.substring(0, 500) + '...' : 'null');
  }

  console.log('\\nChecking furniture_items photo details...');
  const { data: photos, error: pError } = await supabase
    .from('furniture_items')
    .select('id, name, description, category_id, tags')
    .in('id', photoIds);
    
  if (pError) console.error(pError);
  else console.log(JSON.stringify(photos, null, 2));

  // Let's also check if there are tags returned in photo_tags for these photos if there's a table
  console.log('\\nChecking photo_tags for these photos...');
  const { data: photoTags, error: ptError } = await supabase
    .from('photo_tags')
    .select('*')
    .in('photo_id', photoIds);
  if (ptError) {
    console.warn('photo_tags query failed or table does not exist:', ptError.message);
  } else {
    console.log('photo_tags items:', photoTags);
  }
}

check();
