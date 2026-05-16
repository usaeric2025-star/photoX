import { supabase } from '../lib/supabase';
import { DB_CONFIG, PAGINATION } from '../constants/config';
import { Photo } from '../types';
import { uploadImages } from './storageService';
import { validateDimension } from '../utils/dimensionValidator';
import { mapSupabasePhoto, photoCache } from './photoService';
import { safeArray } from '../lib/utils';

const FIELD_MAP: Record<string, string> = {
  groupId: 'group_id',
  isGroupCover: 'is_group_cover',
  categoryId: 'category_id',
  manufacturerId: 'manufacturer_id',
  isPinned: 'is_pinned',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  itemCode: 'item_code',
  manualCode: 'manual_code',
  imageHash: 'image_hash',
  imageUrl: 'image_url',
  thumbUrl: 'thumb_url',
  modelNumber: 'model_number',
  userId: 'user_id',
  descriptionTranslations: 'description_translations',
  isHidden: 'isHidden',
};

const ALLOWED_FIELDS = [
  'id', 'name', 'description', 'description_translations', 'categoryId',
  'tagIds', 'dimensions', 'model_number', 'manual_code', 'groupId', 'isGroupCover',
  'image_url', 'thumb_url', 'price', 'updated_at', 'created_at', 'userId',
  'isHidden'
];

const mapToDb = (updates: Partial<Photo> & Record<string, any>, isCreate = false): Record<string, any> => {
    const dbUpdates: any = {};
    
    // Filter updates based on whitelist
    const filteredUpdates: Record<string, any> = {};
    for (const key of ALLOWED_FIELDS) {
        if (key in updates) {
            filteredUpdates[key] = updates[key];
        }
    }
    
    // Map fields
    for (const [key, value] of Object.entries(filteredUpdates)) {
        // Exclude relational/array fields that are handled separately
        if (['tagIds', 'dimensions'].includes(key)) continue;

        // Ensure we explicitly ignore UI-only fields if they somehow slip through
        if (['isAnalyzing'].includes(key)) continue;
        
        if (FIELD_MAP[key]) {
            dbUpdates[FIELD_MAP[key]] = value;
        } else {
            dbUpdates[key] = value;
        }
    }
    
    // Auto-timestamps
    dbUpdates.updated_at = new Date().toISOString();
    if (isCreate && !dbUpdates.created_at) {
        dbUpdates.created_at = new Date().toISOString();
    }
    
    // Array safety
    if ('dimensions' in updates) {
        dbUpdates.dimensions = Array.isArray(updates.dimensions) ? updates.dimensions : [];
        normalizeDimensionsBeforeSave(dbUpdates.dimensions);
    }
    
    // Ensure Price unit
    if (dbUpdates.price && typeof dbUpdates.price === 'string' && !dbUpdates.price.includes('RM')) {
        dbUpdates.price = `RM ${dbUpdates.price.replace(/RM/gi, '').trim()}`;
    }
    
    return dbUpdates;
};

export const savePhotoToCloud = async (userId: string, photo: Photo, onStatus?: (s: string) => void): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('No active session for database');
  }

  // Upload image if it doesn't have an image_url yet but has a uri
  console.log('DEBUG [savePhotoToCloud]: photo.image_url', !!photo.image_url, 'photo.uri', !!photo.uri);
  if (!photo.image_url && photo.uri) {
    console.log('DEBUG [savePhotoToCloud]: Proceeding to upload image');
    try {
      const filename = photo.storageId || photo.id;
      const { imageUrl, thumbUrl } = await uploadImages(userId, filename, photo.uri, onStatus);
      photo.image_url = imageUrl;
      photo.thumb_url = thumbUrl;
    } catch (e) {
      // Ignored
    }
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(photo.id);
  
  normalizeDimensionsBeforeSave(photo.dimensions);

  const payload: any = mapToDb({
    ...photo,
    userId: session.user.id,
  }, !isUUID);

  if (isUUID) {
    payload.id = photo.id;
  }

  // Upsert on photo as before
  let { data: savedPhoto, error: dbError } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .upsert(payload, { 
      onConflict: 'id',
      ignoreDuplicates: false 
    })
    .select('id')
    .maybeSingle();

  if (dbError) {
    console.error("Supabase Database Upsert Error:", dbError);
    throw new Error(`數據同步失敗: ${dbError.message}`);
  }

  photoCache.clear();
  const finalPhotoId = savedPhoto?.id || photo.id;

  // Update the photo object in-place so callers get the persistent ID
  if (photo.id !== finalPhotoId) {
    photo.id = finalPhotoId;
  }

  const sTagIds = safeArray(photo.tagIds);
  if (sTagIds.length >= 0) {
    // 1. Delete existing associations
    await supabase.from('photo_tags').delete().eq('photo_id', finalPhotoId);
    
    // 2. Insert new associations
    if (sTagIds.length > 0) {
      const tagAssociations = sTagIds
        .filter(tid => !!tid)
        .map(tagId => ({
          photo_id: finalPhotoId,
          tag_id: tagId
        }));
      
      if (tagAssociations.length > 0) {
        const { error: tagError } = await supabase.from('photo_tags').insert(tagAssociations);
        if (tagError) console.warn("Failed to sync photo tags:", tagError);
      }
    }
  }

  return finalPhotoId;
};

// Bulk save photos (much faster than individual calls)
export const savePhotosToCloudBatch = async (
  userId: string, 
  photos: Photo[],
  onProgress?: (count: number) => void
): Promise<Photo[]> => {
  const sPhotos = safeArray(photos);
  if (sPhotos.length === 0) return [];

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('No active session for database');
  }

  // Handle any pending uploads (unlikely in batch edit, but just in case)
  for (const photo of photos) {
    if (!photo.image_url && photo.uri) {
      try {
        const filename = photo.storageId || photo.id;
        const { imageUrl, thumbUrl } = await uploadImages(userId, filename, photo.uri);
        photo.image_url = imageUrl;
        photo.thumb_url = thumbUrl;
      } catch (e) {
        // Ignored
      }
    }
  }

  const results: Photo[] = [...sPhotos.map(p => ({ ...p }))];
  const payloads = sPhotos.map(photo => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(photo.id);
    
    normalizeDimensionsBeforeSave(photo.dimensions);

    const payload: any = {
      user_id: session.user.id,
      item_code: photo.item_code,
      manual_code: photo.manual_code || '',
      image_hash: photo.image_hash,
      name: photo.name,
      category_id: photo.categoryId || null,
      manufacturer_id: photo.manufacturerId || null,
      description: photo.description || '',
      image_url: photo.image_url,
      thumb_url: photo.thumb_url || null,
      dimensions: photo.dimensions || null,
      model_number: photo.model_number || '',
      description_translations: photo.description_translations || null,
      created_at: photo.createdAt,
      group_id: photo.groupId || null,
      is_group_cover: photo.isGroupCover || false,
      isHidden: photo.isHidden || false,
      updated_at: photo.updatedAt || new Date().toISOString()
    };
    if (isUUID) {
      payload.id = photo.id;
    }
    return payload;
  });

  // 1. Bulk Upsert Photos
  const chunkSize = PAGINATION.CHUNK_SIZE;
  for (let i = 0; i < payloads.length; i += chunkSize) {
    const chunk = payloads.slice(i, i + chunkSize);
    let { data: savedRows, error: dbError } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false })
      .select('id, image_hash');

    // FALLBACK for schema mismatch
    if (dbError && dbError.message.includes('column')) {
       console.warn("DB Schema mismatch, retrying chunk without group columns...");
       const safeChunk = chunk.map(p => {
         const cp = { ...p };
         delete cp.group_id;
         delete cp.group_order;
         delete cp.is_group_cover;
         delete cp.group_metadata;
         return cp;
       });
       const retry = await supabase.from(DB_CONFIG.TABLE_NAME).upsert(safeChunk, { onConflict: 'id' }).select('id, image_hash');
       savedRows = retry.data;
       dbError = retry.error;
    }

    if (dbError) {
      console.error("Bulk Upsert Error:", dbError);
      throw new Error(`批量同步失敗: ${dbError.message}`);
    }
    
    photoCache.clear();
    // Update IDs in results array - more robust matching using usedIndexes to handle same-hash duplicates
    if (savedRows) {
      const usedIndexes = new Set<number>();
      savedRows.forEach((row: any) => {
        // Find by image_hash in the results, ensuring we don't map two DB rows to the same local item
        const photoIndex = results.findIndex((p, idx) => 
          p.image_hash === row.image_hash && !usedIndexes.has(idx)
        );
        if (photoIndex !== -1) {
          results[photoIndex].id = row.id;
          usedIndexes.add(photoIndex);
        }
      });
    }
    
    if (onProgress) onProgress(Math.min(i + chunkSize, payloads.length));
  }

  // 2. Bulk Sync Tags
  const photoIdsToUpdate = safeArray(results).map(p => p.id);
  
  // Wipe existing tags for these photos
  for (let i = 0; i < photoIdsToUpdate.length; i += 100) {
     const chunkIds = photoIdsToUpdate.slice(i, i + 100);
     await supabase.from('photo_tags').delete().in('photo_id', chunkIds);
  }

  // Insert new tags
  const newTagAssociations: any[] = [];
  safeArray(results).forEach(p => {
    const pTagIds = safeArray(p.tagIds);
    if (pTagIds.length > 0) {
      pTagIds.forEach(tid => {
        if (tid) newTagAssociations.push({ photo_id: p.id, tag_id: tid });
      });
    }
  });

  for (let i = 0; i < newTagAssociations.length; i += 200) {
    const chunk = newTagAssociations.slice(i, i + 200);
    const { error: tagError } = await supabase.from('photo_tags').insert(chunk);
    if (tagError) console.warn("Failed to bulk sync photo tags:", tagError);
  }

  return results;
};

export const updatePhoto = async (
  photoId: string, 
  updates: Partial<Photo>,
  setPhotos?: React.Dispatch<React.SetStateAction<Photo[]>>
): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('NO_ACTIVE_SESSION');

  const dbUpdates = mapToDb(updates);
  
  if (setPhotos) setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, ...updates } : p));
  
  await updatePhotoInCloud(photoId, dbUpdates);
    
  // Sync tags if needed
  if ('tagIds' in updates) {
      await supabase.from('photo_tags').delete().eq('photo_id', photoId);
      const uTagIds = safeArray(updates.tagIds);
      if (uTagIds.length > 0) {
          const tagAssociations = uTagIds.map(tagId => ({
              photo_id: photoId,
              tag_id: tagId
          }));
          await supabase.from('photo_tags').insert(tagAssociations);
      }
  }
};

export const batchUpdatePhotos = async (updates: { id: string; updates: Partial<Photo> }[]) => {
    // For small batch, sequential is acceptable for simplicity to ensure correctness
    for (const item of updates) {
        await updatePhoto(item.id, item.updates);
    }
    photoCache.clear();
};

export const updatePhotoInCloud = async (photoId: string, updates: Partial<Photo> & Record<string, any>) => {
  if (updates.dimensions !== undefined) {
    normalizeDimensionsBeforeSave(updates.dimensions);
  }
  
  const { error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update(updates)
    .eq('id', photoId);
    
  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }
  photoCache.clear();
};

export const updateGroupOrder = async (photoId: string, groupOrder: number | null): Promise<void> => {
    // Deprecated: group_order is removed from DB.
    console.warn("updateGroupOrder is deprecated.");
};

export const updatePhotoHidden = async (photoId: string, isHidden: boolean) => {
  return updatePhotoInCloud(photoId, { 
    isHidden: isHidden,
    updated_at: new Date().toISOString()
  });
};

export const deletePhotoFromCloud = async (userId: string, photo: Photo) => {
  const { error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .delete()
    .match({ id: photo.id, user_id: userId });

  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }
  photoCache.clear();
};

export const deletePhotosBatch = async (
  userId: string, 
  photos: Photo[], 
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal
) => {
  const sPhotos = safeArray(photos);
  if (sPhotos.length === 0) return;
  
  const total = sPhotos.length;
  const BATCH_SIZE = PAGINATION.BATCH_SIZE;
  
  for (let i = 0; i < sPhotos.length; i += BATCH_SIZE) {
    if (signal?.aborted) throw new Error('Operation aborted');
    
    const chunk = sPhotos.slice(i, i + BATCH_SIZE);
    const ids = chunk.map(p => p.id);
    
    // 1. Delete DB records
    const { data, error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .delete()
      .in('id', ids)
      .eq('user_id', userId)
      .select('id');
    
    if (error) {
      console.error(`[photoService] deletePhotosBatch DB error:`, error);
      throw new Error(error.message || JSON.stringify(error));
    }
    
    // 2. Delete files - ONLY if no other records use this specific URL/hash
    const potentiallyDeletable = chunk.filter(p => !!p.image_url);
    const filesToRemove: string[] = [];
    
    for (const p of potentiallyDeletable) {
      // Check if ANY other record (not just mine) still uses this image_url
      const { count } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select('*', { count: 'exact', head: true })
        .eq('image_url', p.image_url);
      
      if (count === 0) {
        const filename = p.storageId || p.id;
        filesToRemove.push(`public/${filename}.webp`);
        filesToRemove.push(`public/thumb_${filename}.webp`);
      } else {
        console.log(`[Storage] Skipping file deletion for ${p.id} as ${count} other records use its URL.`);
      }
    }
    
    if (filesToRemove.length > 0) {
        await supabase.storage.from(DB_CONFIG.BUCKET_NAME).remove(filesToRemove);
    }
    
    if (onProgress) onProgress(Math.min(i + BATCH_SIZE, total), total);
  }
  
  photoCache.clear();
};

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
    
    const { error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .update(dbUpdates)
      .in('id', chunkIds)
      .eq('user_id', userId);
      
    if (error) throw error;
    
    // Also sync tags if provided in updates
    if ('tagIds' in updates) {
       for (const photoId of chunkIds) {
          if (signal?.aborted) throw new Error('Operation aborted');
          await supabase.from('photo_tags').delete().eq('photo_id', photoId);
          const uTagIds = safeArray(updates.tagIds);
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
  
  photoCache.clear();
};

export const clearCategoryFromPhotos = async (categoryId: string) => {
  const { data, error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update({ category_id: null })
    .eq('category_id', categoryId)
    .select('id');
    
  if (error) throw error;
  photoCache.clear();
  return data;
};

export const clearManufacturerFromPhotos = async (mfrId: string) => {
  const { data, error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update({ manufacturer_id: null })
    .eq('manufacturer_id', mfrId)
    .select('id');
    
  if (error) throw error;
  photoCache.clear();
  return data;
};

export const checkImageHashExists = async (hash: string): Promise<{image_url: string, manual_code: string} | null> => {
  try {
    const { data, error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('image_url, manual_code')
      .eq('image_hash', hash)
      .not('image_url', 'is', null)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? { image_url: data.image_url, manual_code: data.manual_code } : null;
  } catch (err) {
    console.error("Hash check failed:", err);
    return null;
  }
};

export const clearGroupIdInCloud = async (groupId: string) => {
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
    throw new Error(`清除照片群组关联失败: ${error.message}`);
  }
  
  photoCache.clear();
  return data;
};

export const ungroupPhotos = async (groupId: string) => {
  return clearGroupIdInCloud(groupId);
};

export const groupPhotos = async (photoIds: string[]) => {
  if (photoIds.length === 0) return;
  const groupId = `group_${Date.now()}`;
  return updatePhotosGroupInCloud(photoIds, { 
    group_id: groupId,
    is_group_cover: false 
  });
};

export const updatePhotosGroupInCloud = async (photoIds: string[], updates: Record<string, any>) => {
  const { data, error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update(updates)
    .in('id', photoIds)
    .select('id');
    
  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }
  
  photoCache.clear();
  return data;
};

export const deduplicatePhotos = async (userId?: string): Promise<{removed: number}> => {
  try {
    let query = supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id, image_hash, created_at, storageId, image_url, user_id')
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

function normalizeDimensionsBeforeSave(dimensions: any[] | null | undefined) {
  const sDims = safeArray(dimensions);
  sDims.forEach((dim) => {
    if (dim && typeof dim === 'object') {
        const maxVal = Math.max(Number(dim.length) || 0, Number(dim.width) || 0, Number(dim.height) || 0);
        // Create a temporary object matching Dimension structure for validation if value is missing
        const validated = validateDimension({ ...dim, value: maxVal });
        if (validated?.unit) {
          dim.unit = validated.unit;
        }
      }
  });
}
