import { 
  batchUpdatePhotosInCloud as updatePhotosBatch,
  clearCategoryFromPhotos,
  clearManufacturerFromPhotos,
  ungroupPhotos
} from '../photoMutationService';
import { supabase } from '../../lib/supabase';
import { DB_CONFIG } from '../../constants/config';
import { Photo } from '../../types';
import { safeArray } from '../../lib/utils';
import { deletePhotoFromCloud } from '../photoMutationService';
import { StandardError } from '@/lib/validators/protocol';

export { updatePhotosBatch, clearCategoryFromPhotos, clearManufacturerFromPhotos, ungroupPhotos };

export const clearGroupIdInCloud = ungroupPhotos;

export const deduplicatePhotos = async (userId?: string): Promise<{removed: number}> => {
  try {
    let query = supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id, image_hash, created_at, image_url, user_id, group_id, storage_id')
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error || !data) return { removed: 0 };

    const groups: Record<string, Photo[]> = {};
    safeArray(data).forEach(item => {
      if (!item.image_hash) return;
      const key = `${item.user_id}_${item.image_hash}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item as Photo);
    });

    let removedCount = 0;
    for (const key in groups) {
      const group = groups[key];
      if (group.length > 1) {
        const [original, ...duplicates] = group;
        for (const duplicate of duplicates) {
          try {
            if (duplicate.user_id) {
               await deletePhotoFromCloud(duplicate.user_id, duplicate);
               removedCount++;
            }
          } catch (e) {
            console.error(`Failed to remove duplicate ${duplicate.id}:`, e);
          }
        }
      }
    }
    return { removed: removedCount };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new StandardError(message, {
       originalError: error,
       aiDebugHint: `[deduplicatePhotos] 底層異常: ${message}`
    });
  }
};

export const scanAndRepairPhotoIds = async (photos: Photo[]): Promise<Photo[]> => {
  const brokenPhotos = photos.filter(p => !p.id || p.id.startsWith('temp-'));
  return brokenPhotos;
};
