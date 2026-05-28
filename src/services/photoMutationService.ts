import { supabase } from '../lib/supabase';
import { DB_CONFIG } from '../constants/config';
import { Photo } from '../types';
import { mapToDb } from './photo/photoMappingUtils';
import { safeArray } from '../lib/utils';
import { createPhotoValidator } from '../lib/validators/factory';
import { generateItemCode } from './utils';

/**
 * Service for all photo-related write operations (Insert, Update, Delete).
 * Adheres to PhotoX Coding Rules v2.0.
 */

export const updatePhotoInCloud = async (photoId: string, updates: Partial<Photo> & Record<string, unknown>) => {
  if (!photoId || photoId.startsWith('temp-')) {
    throw new Error('无效的照片ID，操作被终止');
  }
  
  // Clean up updates
  const cleanUpdates = { ...updates };
  delete cleanUpdates.id;

  // [APF-CONTRACT] Validate updates before processing
  const validator = createPhotoValidator();
  const validationRes = validator.validate(cleanUpdates);
  if (validationRes.isErr()) {
    throw new Error(`Validation Failed: ${validationRes.error.message}. Hint: ${validationRes.error.aiDebugHint}`);
  }

  const dbUpdates = mapToDb(cleanUpdates);
  
  let { error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update(dbUpdates)
    .eq('id', photoId);
    
  if (error && error.message.includes('furniture_items_item_code_key')) {
    console.warn("Item code collision during update, regenerating...");
    const retryUpdates = { ...dbUpdates, item_code: generateItemCode() };
    const { error: retryError } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .update(retryUpdates)
      .eq('id', photoId);
    error = retryError;
  }
    
  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }

  // Handle tags if present
  if ('tag_ids' in updates) {
    await syncPhotoTags(photoId, safeArray(updates.tag_ids));
  }
};

export const syncPhotoTags = async (photoId: string, tagIds: string[]) => {
  await supabase.from('photo_tags').delete().eq('photo_id', photoId);
  if (tagIds.length > 0) {
    const associations = tagIds.map(tagId => ({
      photo_id: photoId,
      tag_id: tagId
    }));
    const { error } = await supabase.from('photo_tags').insert(associations);
    if (error) throw error;
  }
};

export const batchUpdatePhotosInCloud = async (
  userId: string,
  ids: string[],
  updates: Partial<Photo>,
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal
) => {
  if (ids.length === 0) return;
  
  const total = ids.length;
  const BATCH_SIZE = 100; // Standard batch size
  
  // [APF-CONTRACT] Validate updates before batch processing
  const validator = createPhotoValidator();
  const validationRes = validator.validate(updates);
  if (validationRes.isErr()) {
    throw new Error(`Batch Validation Failed: ${validationRes.error.message}. Hint: ${validationRes.error.aiDebugHint}`);
  }

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
      console.warn("Item code collision in batch update, processing chunk one-by-one...");
      const { generateItemCode } = await import('./utils');
      for (const singleId of chunkIds) {
        const singleUpdates = { ...dbUpdates };
        singleUpdates.item_code = generateItemCode();
        const { error: singleError } = await supabase
          .from(DB_CONFIG.TABLE_NAME)
          .update(singleUpdates)
          .eq('id', singleId)
          .eq('user_id', userId);
        if (singleError) throw singleError;
      }
      error = null;
    }
      
    if (error) throw error;
    
    // Sync tags if provided
    if ('tag_ids' in updates) {
       for (const photoId of chunkIds) {
          if (signal?.aborted) throw new Error('Operation aborted');
          await syncPhotoTags(photoId, safeArray(updates.tag_ids));
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

export const ungroupPhotos = async (groupId: string) => {
  // Clear group_id for all photos in this group
  const { error: updateError } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update({ 
      group_id: null, 
      is_pinned: false,
      is_group_cover: false
    })
    .eq('group_id', groupId);

  if (updateError) throw updateError;

  // Then delete the group entry itself
  const { deleteGroupFromCloud } = await import('./groupMutationService');
  await deleteGroupFromCloud(groupId);
};

export const deletePhotoFromCloud = async (userId: string, photo: Photo): Promise<{ dissolvedGroupId?: string }> => {
  const photoId = photo.id;
  const groupId = photo.group_id;
  const imageUrl = photo.image_url;
  const storageId = photo.storage_id || photoId;
  
  const { error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .delete()
    .match({ id: photoId, user_id: userId });

  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }

  // Physical Cleanup
  if (imageUrl) {
     const { count } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select('id', { count: 'exact', head: true })
        .eq('image_url', imageUrl);
      
     if (count === 0) {
        const { cleanupPhysicalStorage } = await import('./storage');
        await cleanupPhysicalStorage([storageId], [imageUrl]);
     }
  }
  
  let dissolvedGroupId: string | undefined;

  // If the deleted photo was part of a group, check if we need to dissolve it
  if (groupId) {
    const { data: remaining } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id')
      .eq('group_id', groupId);
      
    if (remaining && remaining.length <= 1) {
      await ungroupPhotos(groupId);
      dissolvedGroupId = groupId;
    }
  }

  return { dissolvedGroupId };
};

export const movePhotosToGroup = async (userId: string, photoIds: string[], targetGroupId: string | null) => {
  return await batchUpdatePhotosInCloud(userId, photoIds, { group_id: targetGroupId });
};

export const updatePhotoHiddenState = async (photoId: string, is_hidden: boolean) => {
  return updatePhotoInCloud(photoId, { 
    is_hidden,
    updated_at: new Date().toISOString()
  });
};

/**
 * [RED-LINE] Photo Mutation Service singleton
 */
export const photoMutationService = {
  update: updatePhotoInCloud,
  batchUpdate: batchUpdatePhotosInCloud,
  delete: deletePhotoFromCloud,
  toggleHidden: updatePhotoHiddenState,
  movePhotosToGroup,
  syncTags: syncPhotoTags
};
