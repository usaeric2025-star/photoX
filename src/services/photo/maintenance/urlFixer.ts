import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { logger } from '@/lib/logger';

export const standardizePhotoUrl = (url: string): string => {
  if (!url) return '';
  const workerUrl = import.meta.env.VITE_IMAGE_WORKER_URL;
  let normalized = workerUrl ? url.replace(workerUrl, '') : url;
  
  normalized = normalized
    .replace(/^\//, '')
    .replace(/^thumb_/, '')
    .replace(/^thumbnails\//, '')
    .replace(/_t\.webp$/, '.webp')
    .replace(/\?.*$/, '');
    
  return normalized;
};

export const bulkFixPhotoUrls = async (): Promise<{ updated: number, errors: number }> => {
  logger.info('[Maintenance] Starting Bulk Fix Photo URLs...');
  
  const { data: photos, error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('id, image_url');

  if (error) throw error;
  if (!photos) return { updated: 0, errors: 0 };

  let updated = 0;
  let errors = 0;

  for (const photo of photos) {
    if (!photo.image_url) continue;
    
    const standardUrl = standardizePhotoUrl(photo.image_url);
    if (standardUrl !== photo.image_url) {
      const { error: updateError } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .update({ image_url: standardUrl })
        .eq('id', photo.id);
        
      if (updateError) {
        logger.error(`Failed to update ${photo.id}:`, updateError);
        errors++;
      } else {
        updated++;
      }
    }
  }
  
  logger.info(`[Maintenance] Bulk Fix completed: ${updated} updated, ${errors} errors.`);
  return { updated, errors };
};
