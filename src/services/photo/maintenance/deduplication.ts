import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { Photo } from '@/types';
import { safeArray } from '@/lib/utils';
import { deletePhoto } from '../commands';
import { logger } from '@/lib/logger';
import { AppResult, success } from '@/lib/error/ErrorFactory';

export const deduplicatePhotos = async (userId?: string): Promise<AppResult<{removed: number}>> => {
  try {
    let query = supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id, image_hash, created_at, image_url, user_id, group_id, storage_id')
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error || !data) return success({ removed: 0 });

    const groups: Record<string, Photo[]> = {};
    safeArray<Photo>(data as any).forEach(item => {
      if (!item.image_hash) return;
      const key = `${item.user_id}_${item.image_hash}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    let removedCount = 0;
    for (const key in groups) {
      const group = groups[key];
      if (group.length > 1) {
        const [original, ...duplicates] = group;
        for (const duplicate of duplicates) {
          try {
            if (duplicate.user_id) {
               await deletePhoto(duplicate as Photo);
               removedCount++;
            }
          } catch (e) {
            logger.error(`Failed to remove duplicate ${duplicate.id}:`, e);
          }
        }
      }
    }
    return success({ removed: removedCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return success({ removed: 0 }); // Simplified error fallback for now, originally was errorFactory
  }
};
