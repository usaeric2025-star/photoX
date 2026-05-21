import { supabase } from '../../lib/supabase';
import { DB_CONFIG, PAGINATION } from '../../constants/config';
import { Photo } from '../../types';
import { safeArray } from '../../lib/utils';
import { mapToDb } from './photoMappingUtils';

export const updatePhotosBatch = async (
  userId: string,
  ids: string[],
  updates: Partial<Photo>,
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal
) => {
  if (ids.length === 0) return;
  
  const total = ids.length;
  const BATCH_SIZE = PAGINATION.BATCH_SIZE;
  const dbUpdates = mapToDb(updates);
  
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    if (signal?.aborted) throw new Error('Operation aborted');
    
    const chunkIds = ids.slice(i, i + BATCH_SIZE);
    
    let { error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .update(dbUpdates)
      .in('id', chunkIds)
      .eq('user_id', userId);
      
    if (error && error.message.includes('furniture_items_item_code_key')) {
      console.warn("Item code collision in updatePhotosBatch, processing chunk one-by-one with regenerated item_codes...");
      const { generateItemCode } = await import('../utils');
      for (const singleId of chunkIds) {
        const singleUpdates = { ...dbUpdates };
        singleUpdates.item_code = generateItemCode();
        const singleResult = await supabase
          .from(DB_CONFIG.TABLE_NAME)
          .update(singleUpdates)
          .eq('id', singleId)
          .eq('user_id', userId);
        if (singleResult.error) {
          throw singleResult.error;
        }
      }
      error = null;
    }
      
    if (error) throw error;
    
    // Also sync tags if provided in updates
    if ('tag_ids' in updates) {
       for (const photoId of chunkIds) {
          if (signal?.aborted) throw new Error('Operation aborted');
          await supabase.from('photo_tags').delete().eq('photo_id', photoId);
          const uTagIds = safeArray(updates.tag_ids);
          if (uTagIds.length > 0) {
            const tagAssociations = uTagIds.map(tagId => ({
              photo_id: photoId,
              tag_id: tagId
            }));
            await supabase.from('photo_tags').insert(tagAssociations);
          }
       }
    }
    
    if (onProgress) onProgress(Math.min(i + BATCH_SIZE, total), total);
  }
};

export const clearCategoryFromPhotos = async (categoryId: string) => {
  const { data, error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update({ category_id: null })
    .eq('category_id', categoryId)
    .select('id');
    
  if (error) throw error;
  return data;
};

export const clearManufacturerFromPhotos = async (mfrId: string) => {
  const { data, error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update({ manufacturer_id: null })
    .eq('manufacturer_id', mfrId)
    .select('id');
    
  if (error) throw error;
  return data;
};

export const clearGroupIdInCloud = async (groupId: string) => {
  // 1. Clear group_id for all photos in this group
  const { error: updateError } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update({ 
      group_id: null, 
      is_pinned: false,
      is_group_cover: false
    })
    .eq('group_id', groupId);
    
  if (updateError) {
    throw new Error(`清除照片群组关联失败: ${updateError.message}`);
  }
  
  // 2. Delete the group record itself to avoid empty groups
  const { error: deleteError } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (deleteError) {
    console.warn(`[Warning] Failed to delete group record ${groupId}:`, deleteError.message);
  }
  
  return { success: true };
};

export const ungroupPhotos = async (groupId: string) => {
  return clearGroupIdInCloud(groupId);
};

export const deduplicatePhotos = async (userId?: string): Promise<{removed: number}> => {
  try {
    let query = supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id, image_hash, created_at, storage_id, image_url, user_id, group_id')
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error || !data) return { removed: 0 };

    const groups: Record<string, any[]> = {};
    safeArray(data).forEach(item => {
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
            await supabase.from(DB_CONFIG.TABLE_NAME).delete().eq('id', duplicate.id);
            if (duplicate.image_url && duplicate.image_url !== original.image_url) {
                const { count } = await supabase
                    .from(DB_CONFIG.TABLE_NAME)
                    .select('*', { count: 'exact', head: true })
                    .eq('image_url', duplicate.image_url);
                
                if (count === 0) {
                    const filename = duplicate.storage_id || duplicate.id;
                    await supabase.storage.from(DB_CONFIG.BUCKET_NAME).remove([`public/${filename}.webp`]);
                }
            }
            // Check if the deleted duplicate was in a group and handle dissolving
            if (duplicate.group_id) {
               const { data: remaining } = await supabase
                 .from(DB_CONFIG.TABLE_NAME)
                 .select('id')
                 .eq('group_id', duplicate.group_id);
                 
               if (remaining && remaining.length <= 1) {
                 await clearGroupIdInCloud(duplicate.group_id);
               }
            }
            removedCount++;
          } catch (e) {
            console.error(`Failed to remove duplicate ${duplicate.id}:`, e);
          }
        }
      }
    }
    return { removed: removedCount };
  } catch (err) {
    console.error("Deduplication failed:", err);
    return { removed: 0 };
  }
};

export const scanAndRepairPhotoIds = async (photos: Photo[]): Promise<Photo[]> => {
  const brokenPhotos = photos.filter(p => !p.id || p.id.startsWith('temp-'));
  return brokenPhotos;
};
