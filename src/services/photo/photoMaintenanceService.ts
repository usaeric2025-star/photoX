import { logger } from '@/lib/logger';
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
import { errorFactory, success } from '@/lib/errorFactory';
import type { AppResult } from '@/lib/errorFactory';
import { StandardError } from '@/lib/validators/protocol';

export { updatePhotosBatch, clearCategoryFromPhotos, clearManufacturerFromPhotos, ungroupPhotos };

export const clearGroupIdInCloud = ungroupPhotos;

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
               await deletePhotoFromCloud(duplicate.user_id, duplicate);
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
    return errorFactory(message, 'DB_ERROR', `[deduplicatePhotos] 底層異常: ${message}`, error);
  }
};

export const cleanUpOrphanRecords = async (): Promise<{ count: number }> => {
  logger.info('[Maintenance] Starting Orphan Records Cleanup...');
  try {
    const { data: orphans, error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id')
      .or('image_url.is.null,image_url.eq.""');

    if (error) throw error;
    if (!orphans || orphans.length === 0) {
      return { count: 0 };
    }

    const ids = orphans.map(o => o.id);
    const { error: delError } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .delete()
      .in('id', ids);

    if (delError) throw delError;
    logger.info(`[Maintenance] Successfully removed ${ids.length} orphan records.`);
    return { count: ids.length };
  } catch (err) {
    logger.error('[Maintenance] Failed to clean orphans:', err);
    throw err;
  }
};

export const scanAndRepairPhotoIds = async (photos: Photo[]): Promise<Photo[]> => {
  const brokenPhotos = photos.filter(p => !p.id || p.id.startsWith('temp-'));
  return brokenPhotos;
};

export const standardizePhotoUrl = (url: string): string => {
  if (!url) return '';
  // 移除 worker URL 前缀 (VITE_THUMBNAIL_WORKER_URL)
  const workerUrl = import.meta.env.VITE_THUMBNAIL_WORKER_URL;
  let normalized = workerUrl ? url.replace(workerUrl, '') : url;
  
  // 移除常见缩略图前缀和后缀
  normalized = normalized
    .replace(/^\//, '') // 移除前导斜杠
    .replace(/^thumb_/, '')
    .replace(/^thumbnails\//, '')
    .replace(/_t\.webp$/, '.webp')
    .replace(/\?.*$/, ''); // 移除查询参数
    
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
