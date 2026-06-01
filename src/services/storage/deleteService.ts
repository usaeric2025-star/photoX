import { supabase } from '../../lib/supabase';
import { DB_CONFIG } from '../../constants/config';
import { api } from '@/lib/api';

/**
 * Universal storage cleanup service
 * Handles both Supabase Storage and R2 Storage based on the URL type
 */
export const cleanupPhysicalStorage = async (fileKeys: string[], urls: string[]): Promise<void> => {
  if (fileKeys.length === 0) return;

  const r2Files: string[] = [];
  const supabaseFiles: string[] = [];

  urls.forEach((url, index) => {
    const key = fileKeys[index];
    if (!url || !key) return;

    if (url.includes('r2.cloudflarestorage.com') || url.includes('photox-r2')) {
      r2Files.push(`${key}.webp`);
      r2Files.push(`thumb_${key}.webp`);
    } else if (url.includes('supabase.co')) {
      supabaseFiles.push(`public/${key}.webp`);
      supabaseFiles.push(`public/thumb_${key}.webp`);
    }
  });

  const tasks: Promise<any>[] = [];

  // Cleanup Supabase
  if (supabaseFiles.length > 0) {
    tasks.push(supabase.storage.from(DB_CONFIG.BUCKET_NAME).remove(supabaseFiles));
  }

  // Cleanup R2 via Server API
  if (r2Files.length > 0) {
    tasks.push(
      api['r2-delete'].$post({
        json: { fileKeys: r2Files }
      }).then((res: Response) => {
        if (!res.ok) console.warn('R2 cleanup API failed');
        return res.json();
      }).catch((err: Error) => console.error('R2 cleanup error:', err))
    );
  }

  await Promise.allSettled(tasks);
};
