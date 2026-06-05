import { supabase } from '../lib/supabase';
import { DB_CONFIG } from '../constants/config';
import { Photo } from '../types';
import { mapToDb } from './photo/photoMappingUtils';
import { safeArray } from '../lib/utils';
import { createPhotoValidator } from '../lib/validators/factory';
import { generateItemCode } from './utils';
import { ErrorFactory } from '../lib/error/ErrorFactory';

/**
 * Service for all photo-related write operations (Insert, Update, Delete).
 * Adheres to PhotoX Coding Rules v2.0.
 */

export const updatePhotoInCloud = async (photoId: string, updates: Partial<Photo> & Record<string, unknown>) => {
  if (!photoId || photoId.startsWith('temp-')) {
    throw ErrorFactory.wrap(new Error('无效的照片ID，操作被终止'), 'updatePhotoInCloud', photoId);
  }
  
  // Clean up updates
  const cleanUpdates = { ...updates };
  delete cleanUpdates.id;

  // [SANITIZE] Explicitly enforce string/null contract for DB fields
  const cUpdates = cleanUpdates as any;

  if (cUpdates.category_id !== undefined && cUpdates.category_id !== null) {
      cUpdates.category_id = String(cUpdates.category_id);
  } else {
      cUpdates.category_id = null;
  }
  
  if (cUpdates.manufacturer_id !== undefined && cUpdates.manufacturer_id !== null) {
      cUpdates.manufacturer_id = String(cUpdates.manufacturer_id);
  } else {
      cUpdates.manufacturer_id = null;
  }
  
  if (cUpdates.price !== undefined && cUpdates.price !== null) {
      cUpdates.price = String(cUpdates.price);
  } else {
      cUpdates.price = null;
  }

  // [APF-CONTRACT] Validate updates before processing
  const validator = createPhotoValidator();
  const validationRes = validator.validate(cUpdates);
  if (!validationRes.ok) {
    throw ErrorFactory.wrap(new Error(`Validation Failed: ${validationRes.message}.`), 'updatePhotoInCloud', photoId);
  }

  const dbUpdates = mapToDb(cleanUpdates);
  
  // [STORAGE-PARADYM] Handle image data URI if present (e.g. from rotation)
  if (cleanUpdates.uri && cleanUpdates.uri.startsWith('data:image')) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { uploadImages } = await import('./storage');
      const { imageUrl } = await uploadImages(session.user.id, photoId, cleanUpdates.uri, undefined, undefined, undefined, true);
      dbUpdates.image_url = imageUrl;
      dbUpdates.updated_at = new Date().toISOString();
    }
  }

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
    throw ErrorFactory.wrap(error, 'updatePhotoInCloud', photoId);
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
  
  // [SANITIZE] Explicitly enforce string/null contract for DB fields
  const cleanUpdates = { ...updates };
  const cUpdates = cleanUpdates as any;
  if (cUpdates.category_id !== undefined && cUpdates.category_id !== null) {
      cUpdates.category_id = String(cUpdates.category_id);
  } else {
      cUpdates.category_id = null;
  }
  
  if (cUpdates.manufacturer_id !== undefined && cUpdates.manufacturer_id !== null) {
      cUpdates.manufacturer_id = String(cUpdates.manufacturer_id);
  } else {
      cUpdates.manufacturer_id = null;
  }
  
  if (cUpdates.price !== undefined && cUpdates.price !== null) {
      cUpdates.price = String(cUpdates.price);
  } else {
      cUpdates.price = null;
  }

  const validationRes = validator.validate(cUpdates);
    if (!validationRes.ok) {
        throw ErrorFactory.wrap(new Error(`Batch Validation Failed: ${validationRes.message}.`), 'batchUpdatePhotosInCloud', userId);
    }

  const dbUpdates = mapToDb(cUpdates);
  
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    if (signal?.aborted) throw ErrorFactory.wrap(new Error('Operation aborted'), 'batchUpdatePhotosInCloud', userId);
    
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
          if (signal?.aborted) throw ErrorFactory.wrap(new Error('Operation aborted'), 'batchUpdatePhotosInCloud - syncTags', photoId);
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
  const { error } = await supabase.rpc('dissolve_group', { group_id: groupId });
  if (error) throw error;
};

export const syncGroupMemberCount = async (groupId: string) => {
  if (!groupId) return;
  const { count, error: countError } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId);

  if (countError) {
    console.warn(`[syncGroupMemberCount] Failed to count for group ${groupId}:`, countError);
    return;
  }

  await supabase
    .from('groups')
    .update({ member_count: count || 0 })
    .eq('id', groupId);
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
    throw ErrorFactory.wrap(error, 'deletePhotoFromCloud', photoId);
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
    } else {
      // Sync count if not dissolved
      await syncGroupMemberCount(groupId);
    }
  }

  return { dissolvedGroupId };
};

export const movePhotosToGroup = async (
  userId: string, 
  photoIds: string[], 
  targetGroupId: string | null
) => {
  const { error } = await supabase.rpc('move_photos_to_group', {
    photo_ids: photoIds,
    target_group_id: targetGroupId
  });
  if (error) throw error;
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
