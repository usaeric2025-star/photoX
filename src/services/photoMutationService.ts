import { supabase } from '../lib/supabase';
import { DB_CONFIG, PAGINATION } from '../constants/config';
import { Photo } from '../types';
import { safeArray } from '../lib/utils';
import { mapToDb, normalizeDimensionsBeforeSave } from './photo/photoMappingUtils';
import { globalHandleError } from '../utils/errorHandler';

// Re-export everything from sub-services for backward compatibility
export * from './photo/photoMappingUtils';
export * from './photo/photoUploadService';
export * from './photo/photoMaintenanceService';

export const updatePhoto = async (
  photoId: string, 
  updates: Partial<Photo>,
  setPhotos?: React.Dispatch<React.SetStateAction<Photo[]>>
): Promise<void> => {
  if (!photoId || photoId.startsWith('temp-')) {
    throw new Error('无效的照片ID，操作被终止');
  }
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
};

export const updatePhotoInCloud = async (photoId: string, updates: Partial<Photo> & Record<string, any>) => {
  delete updates.id;
  if (!photoId || photoId.startsWith('temp-')) {
    throw new Error('无效的照片ID，操作被终止');
  }
  if (updates.dimensions !== undefined) {
    normalizeDimensionsBeforeSave(updates.dimensions);
  }
  
  let { error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update(updates)
    .eq('id', photoId);
    
  if (error && error.message.includes('furniture_items_item_code_key')) {
    console.warn("Item code collision during updatePhotoInCloud, regenerating item_code and retrying...");
    const { generateItemCode } = await import('./utils');
    const retryUpdates = { ...updates, item_code: generateItemCode() };
    const retryResult = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .update(retryUpdates)
      .eq('id', photoId);
    error = retryResult.error;
  }
    
  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }
};

export const updatePhotoHidden = async (photoId: string, is_hidden: boolean) => {
  if (!photoId || photoId.startsWith('temp-')) {
      throw new Error('无效的照片ID，操作被终止');
  }
  return updatePhotoInCloud(photoId, { 
    is_hidden: is_hidden,
    updated_at: new Date().toISOString()
  });
};

export const deletePhotoFromCloud = async (userId: string, photo: Photo): Promise<{ dissolvedGroupId?: string }> => {
  const groupId = photo.groupId || (photo as any).group_id;
  
  const { error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .delete()
    .match({ id: photo.id, user_id: userId });

  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }
  
  let dissolvedGroupId: string | undefined;

  // If the deleted photo was part of a group, check if we need to dissolve it
  if (groupId) {
    const { data: remaining } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id')
      .eq('group_id', groupId);
      
    if (remaining && remaining.length <= 1) {
      const { ungroupPhotos } = await import('./photo/photoMaintenanceService');
      await ungroupPhotos(groupId);
      dissolvedGroupId = groupId;
    }
  }
  
  return { dissolvedGroupId };
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
  const affectedGroupIds = new Set<string>();
  
  for (let i = 0; i < sPhotos.length; i += BATCH_SIZE) {
    if (signal?.aborted) throw new Error('Operation aborted');
    
    const chunk = sPhotos.slice(i, i + BATCH_SIZE);
    const ids = chunk.map(p => p.id).filter(id => id && !id.startsWith('temp-'));
    if (ids.length === 0) continue;

    chunk.forEach(p => { if (p.groupId) affectedGroupIds.add(p.groupId); });
    
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
  
  // Check affected groups and dissolve if only <=1 photo remains
  if (affectedGroupIds.size > 0) {
    const { ungroupPhotos } = await import('./photo/photoMaintenanceService');
    for (const groupId of affectedGroupIds) {
      const { data: remaining } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select('id')
        .eq('group_id', groupId);
        
      if (remaining && remaining.length <= 1) {
        await ungroupPhotos(groupId);
      }
    }
  }
  
};

export const checkImageHashExists = async (hash: string): Promise<{image_url: string, manual_code: string} | null> => {
  try {
    const { data, error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('image_url, manual_code')
      .eq('image_hash', hash)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? { image_url: data.image_url, manual_code: data.manual_code } : null;
  } catch (err) {
    globalHandleError(err, "Hash Check", true);
    return null;
  }
};

export const groupPhotos = async (photoIds: string[], predefinedGroupId?: string) => {
  if (photoIds.length <= 1) {
    throw new Error('至少需要选择两张照片才能成组');
  }
  const groupId = predefinedGroupId || crypto.randomUUID();
  return updatePhotosGroupInCloud(photoIds, { 
    group_id: groupId,
    is_group_cover: false 
  });
};

export const removePhotosFromGroup = async (photoIds: string[], groupId: string) => {
  if (photoIds.length === 0) return;

  // 1. Remove selected photos from group
  await updatePhotosGroupInCloud(photoIds, { 
    group_id: null,
    is_group_cover: false,
    is_pinned: false
  });

  // 2. Check remaining photos in this group (including hidden ones)
  const { data: remainingPhotos, error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('id')
    .eq('group_id', groupId);

  if (error) {
    globalHandleError(error, "Check group consistency", true);
    return;
  }

  // 3. If 1 or 0 photos remain, dissolve the group
  if (remainingPhotos.length <= 1) {
    const { ungroupPhotos } = await import('./photo/photoMaintenanceService');
    await ungroupPhotos(groupId);
  }
};

export const updatePhotosGroupInCloud = async (photoIds: string[], updates: Record<string, any>) => {
  const validIds = photoIds.filter(id => id && !id.startsWith('temp-'));
  if (validIds.length === 0) return;

  const { data, error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update(updates)
    .in('id', validIds)
    .select('id');
    
  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }
  
  return data;
};
