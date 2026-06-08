import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPhoto() {
  const photoId = '935e1a10-9655-4f62-8779-f7204c7f1025';
  console.log(`Inspecting photo: ${photoId}`);
  
  const { data, error } = await supabase
    .from('furniture_items')
    .select('id, name, description')
    .eq('id', photoId)
    .single();
    
  if (error) {
    console.error('Error fetching photo:', error);
  } else {
    console.log('Photo data:', JSON.stringify(data, null, 2));
  }
}

checkPhoto();
