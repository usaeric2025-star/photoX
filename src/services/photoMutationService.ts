import { supabase } from '../lib/supabase';
import { DB_CONFIG, PAGINATION } from '../constants/config';
import { Photo } from '../types';
import { photoCache } from './photoService';
import { safeArray } from '../lib/utils';
import { mapToDb, normalizeDimensionsBeforeSave } from './photo/photoMappingUtils';

// Re-export everything from sub-services for backward compatibility
export * from './photo/photoMappingUtils';
export * from './photo/photoUploadService';
export * from './photo/photoMaintenanceService';

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
    
    const { error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .delete()
      .in('id', ids)
      .eq('user_id', userId);
    
    if (error) {
      throw new Error(error.message || JSON.stringify(error));
    }
    
    const potentiallyDeletable = chunk.filter(p => !!p.image_url);
    const filesToRemove: string[] = [];
    
    for (const p of potentiallyDeletable) {
      const { count } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select('*', { count: 'exact', head: true })
        .eq('image_url', p.image_url);
      
      if (count === 0) {
        const filename = p.storageId || p.id;
        filesToRemove.push(`public/${filename}.webp`);
        filesToRemove.push(`public/thumb_${filename}.webp`);
      }
    }
    
    if (filesToRemove.length > 0) {
        await supabase.storage.from(DB_CONFIG.BUCKET_NAME).remove(filesToRemove);
    }
    
    if (onProgress) onProgress(Math.min(i + BATCH_SIZE, total), total);
  }
  
  photoCache.clear();
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
