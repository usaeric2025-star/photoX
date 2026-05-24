import { createClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.migration') });

async function updateUrls() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const r2PublicUrl = process.env.R2_PUBLIC_URL;

  if (!supabaseUrl || !supabaseKey || supabaseKey === 'YOUR_SUPABASE_SERVICE_KEY') {
    console.error('Please configure SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.migration');
    process.exit(1);
  }

  if (!r2PublicUrl) {
    console.error('Please configure R2_PUBLIC_URL in .env.migration');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Fetching photos to update...');
  const { data: photos, error } = await supabase.from('furniture_items').select('id, image_url, thumb_url');

  if (error) {
    console.error('Failed to fetch photos:', error);
    return;
  }

  if (!photos) {
    console.log('No photos found.');
    return;
  }

  let updateCount = 0;
  const targetSubstring = 'supabase.co/storage/v1/object/public/furniture_images/public/';
  const replacementString = `${r2PublicUrl}/photox/public/`;

  for (const photo of photos) {
    const updates: any = {};
    
    if (photo.image_url && photo.image_url.includes(targetSubstring)) {
      updates.image_url = photo.image_url.replace(targetSubstring, replacementString);
    }
    
    if (photo.thumb_url && photo.thumb_url.includes(targetSubstring)) {
      updates.thumb_url = photo.thumb_url.replace(targetSubstring, replacementString);
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('furniture_items')
        .update(updates)
        .eq('id', photo.id);

      if (updateError) {
        console.error(`Failed to update URL for ${photo.id}:`, updateError);
      } else {
        updateCount++;
        console.log(`Updated URLs for ${photo.id}`);
      }
    }
  }

  console.log(`Complete. Updated ${updateCount} records.`);
}

updateUrls();
