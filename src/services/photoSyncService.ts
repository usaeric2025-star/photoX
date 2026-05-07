import { supabase } from '../lib/supabase';
import { DB_CONFIG } from '../constants/config';
import { Photo } from '../types';
import { uploadImages } from './storageService';
import { photoCache } from './photoService';
import { savePhotoToCloud } from './photoMutationService';

export const syncPhotosToCloud = async (
  userId: string, 
  photos: Photo[], 
  lastSyncTime?: string, 
  onProgress?: (p: number) => void,
  onStatus?: (s: string) => void
): Promise<{success: number, skipped: number}> => {
  let successCount = 0;
  let skippedCount = 0;
  
  // 1. Get current cloud state
  let query = supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('id, storageId, image_hash, image_url, thumb_url, updated_at')
    .eq('user_id', userId);
    
  if (lastSyncTime) {
      query = query.gt('updated_at', lastSyncTime);
  }

  const { data: cloudItems, error: fetchError } = await query;
  
  if (fetchError) {
    console.error("Failed to fetch cloud items for comparison:", fetchError);
  }

  // Cache for local and cloud hash-to-url mapping
  const hashUrlMap = new Map<string, {imageUrl: string, thumbUrl?: string}>();
  
  // Populate cache from existing cloud items
  if (cloudItems) {
    cloudItems.forEach(item => {
      if (item.image_hash && item.image_url) {
        hashUrlMap.set(item.image_hash, {
          imageUrl: item.image_url,
          thumbUrl: item.thumb_url || undefined
        });
      }
    });
  }

  // Populate cache from local photos that already have an image_url
  photos.forEach(p => {
    if (p.image_hash && p.image_url) {
      hashUrlMap.set(p.image_hash, {
        imageUrl: p.image_url,
        thumbUrl: p.thumb_url || undefined
      });
    }
  });

  // 2. Identify cloud items that are NOT in the local list (Cleanup)
  if (!fetchError && !lastSyncTime) {
    const localIds = new Set(photos.map(p => p.id));
    const itemsToDelete = (cloudItems || []).filter(item => !localIds.has(item.id));
    
    if (itemsToDelete.length > 0) {
      for (const item of itemsToDelete) {
        try {
          await supabase.from(DB_CONFIG.TABLE_NAME).delete().match({ id: item.id, user_id: userId });
          const filename = item.storageId || item.id;
          await supabase.storage.from(DB_CONFIG.BUCKET_NAME).remove([`public/${filename}.webp`, `public/thumb_${filename}.webp`]);
        } catch (e) {
          // Ignored
        }
      }
    }
  }

  // 3. Process uploads
  for (const photo of photos) {
    try {
      if (!photo.image_url && photo.uri && photo.image_hash) {
        // 1st Local check: Do we already have the URL for this hash?
        const cachedUrls = hashUrlMap.get(photo.image_hash);
        if (cachedUrls) {
          console.log(`Found locally cached URL for hash ${photo.image_hash}, reusing.`);
          photo.image_url = cachedUrls.imageUrl;
          photo.thumb_url = cachedUrls.thumbUrl;
        }
      }

      if (!photo.image_url && photo.uri) {
        // If still no url, then upload
        const filename = photo.storageId || photo.id;
        const { imageUrl, thumbUrl } = await uploadImages(userId, filename, photo.uri, onStatus);
        photo.image_url = imageUrl;
        photo.thumb_url = thumbUrl;
        
        if (photo.image_hash) {
          hashUrlMap.set(photo.image_hash, { imageUrl, thumbUrl });
        }
      }
      
      const wasSaved = await savePhotoToCloud(userId, photo);
      if (wasSaved) {
        // Update the ID if it was returned (already done in savePhotoToCloud but double check)
        if (typeof wasSaved === 'string') {
           photo.id = wasSaved;
        }
        successCount++;
      } else {
        skippedCount++;
      }
      
      if (onProgress) onProgress(((successCount + skippedCount) / photos.length) * 100);
    } catch (err: any) {
      console.error(`Sync failed for photo ${photo.id}:`, err);
      throw err;
    }
  }
  
  return { success: successCount, skipped: skippedCount };
};

export const clearGroupIdInCloud = async (groupId: string) => {
  console.log(`[Cloud Action] Attempting to clear group_id for all photos in group: ${groupId}`);
  
  const { data, error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update({ 
      group_id: null, 
      is_pinned: false,
      is_group_cover: false
    })
    .eq('group_id', groupId)
    .select('id');
    
  if (error) {
    console.error(`[DB Error] Failed to clear group_id for group ${groupId}:`, error);
    throw new Error(`清除照片群組關聯失敗: ${error.message} (Code: ${error.code})`);
  }
  
  photoCache.clear();
  const affectedCount = data?.length || 0;
  console.log(`[DB Success] 更新照片 group_id 影响行数：${affectedCount}`);
  
  if (affectedCount === 0) {
    const errorMsg = `解散失敗：在雲端找不到屬於此群組的照片。可能照片已同步成功或已被移除。 (No photos linked to group_id: ${groupId})`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
};

export const updatePhotosGroupInCloud = async (photoIds: string[], updates: Record<string, any>) => {
  const { data, error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update(updates)
    .in('id', photoIds)
    .select('id');
    
  if (error) {
    if (error.message.includes('group_id') && error.message.includes('column')) {
      console.warn("Skipping group sync as group_id column appears missing in DB");
      return;
    }
    console.error("Failed to update group photos:", error);
    throw new Error(error.message || JSON.stringify(error));
  }
  
  photoCache.clear();
  if (!data || data.length === 0) {
    const errorMsg = "解散失敗：在雲端找不到對應的照片 ID。請嘗試重新同步或刷新頁面。 (Database match failed)";
    console.error(errorMsg, photoIds);
    throw new Error(errorMsg);
  } else {
    console.log(`Successfully updated ${data.length} photos in cloud.`);
  }
};

export const deduplicatePhotos = async (userId?: string): Promise<{removed: number}> => {
  try {
    // 1. Get all photos and group them by user and hash
    let query = supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id, image_hash, created_at, storageId, image_url, user_id')
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) return { removed: 0 };

    // Group by userId + hash
    const groups: Record<string, typeof data> = {};
    data.forEach(item => {
      if (!item.image_hash) return;
      const key = `${item.user_id}_${item.image_hash}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    let removedCount = 0;
    for (const key in groups) {
      const group = groups[key];
      if (group.length > 1) {
        // Keep the first (oldest) one, delete the rest
        const [original, ...duplicates] = group;
        const [uid] = key.split('_');
        console.log(`User ${uid} has ${group.length} occurrences for hash ${key.split('_')[1]}. Keeping ${original.id}.`);

        for (const duplicate of duplicates) {
          try {
            await supabase.from(DB_CONFIG.TABLE_NAME).delete().eq('id', duplicate.id);
            
            // Only remove from storage if it's NOT the same physical file as the original
            // AND no other record (from any user) is using this file
            if (duplicate.image_url && duplicate.image_url !== original.image_url) {
                // Check if any other record still uses this URL
                const { count } = await supabase
                    .from(DB_CONFIG.TABLE_NAME)
                    .select('*', { count: 'exact', head: true })
                    .eq('image_url', duplicate.image_url);
                
                if (count === 0) {
                    const filename = duplicate.storageId || duplicate.id;
                    await supabase.storage.from(DB_CONFIG.BUCKET_NAME).remove([`public/${filename}.webp`]);
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
