import { ErrorFactory } from '@/lib/error/ErrorFactory';
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
      // Note: Thumbnail logic removed based on Thumbnail Architecture Rule (Worker-side generation)
    } else if (url.includes('supabase.co')) {
      supabaseFiles.push(`public/${key}.webp`);
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
      }).then(async (res: Response) => {
        const result = await res.json();
        if (!res.ok || !result.success) throw ErrorFactory.fatal(result.error || 'R2 delete failed', { context: 'deleteService' });
      })
    );
  }

  await Promise.allSettled(tasks);
};
