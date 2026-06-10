import { getSupabaseAdmin } from './api/lib/supabase.js';

async function run() {
  const supabase = await getSupabaseAdmin();
  const photoIds = [
    'cff3c1c7-d641-4144-9bff-fa2677d527e4',
    '935e1a10-9655-4f62-8779-f7204c7f1025',
    'ed28448e-fe47-40dd-8883-d9ef04bd8698'
  ];

  console.log('Querying photo_ai_results using supabase admin instance...');
  const { data, error } = await supabase
    .from('photo_ai_results')
    .select('*')
    .in('photo_id', photoIds);

  if (error) {
    console.error('Error fetching:', error);
  } else {
    console.log(`Found ${data?.length} records.`);
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
