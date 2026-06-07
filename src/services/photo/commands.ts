import { supabase } from '../../lib/supabase';
import { DB_CONFIG } from '../../constants/config';
import { Photo, ProductFormData } from '../../types';
import { ok, err, isErr, ErrorFactory, success, errorFactory, fromThrowableAsync } from '@/lib/error/ErrorFactory';
import type { Result, AppResult } from '@/types/api';
import { PAGINATION } from '../../config/constants';
import { safeArray } from '../../lib/utils';
import { mapToDb } from './photoMappingUtils';
import { generateItemCode } from './utils';
import { createPhotoValidator } from '../../lib/validators/factory';
import { api } from '@/lib/api';

/**
 * Consolidating all photo mutation logic here from photoMutationService and photoActions.
 */

export interface BatchActionResult {
  successCount: number;
  failureCount: number;
  failedItems: { id: string; reason: string }[];
}

// --- Internal Helper: Sync Tags ---
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

// --- Core Update Command ---
export async function updatePhoto(id: string, updates: Partial<Photo> & Record<string, any>): Promise<AppResult<Photo | null>> {
  if (!id || id.startsWith('temp-')) {
    return errorFactory('无效的照片ID', 'VALIDATION_ERROR', 'updatePhoto', id);
  }

  // 1. Validation
  const validator = createPhotoValidator();
  const validationRes = validator.validate(updates);
  if (!validationRes.ok) {
    return errorFactory(validationRes.message, 'VALIDATION_ERROR', 'updatePhoto', updates);
  }

  try {
    // 2. Handle image data URI if present (e.g. from rotation)
    if (updates.uri && updates.uri.startsWith('data:image')) {
      const { data: { session } } = await supabase.auth.getSession();
      const isLocalStorageStaff = typeof window !== 'undefined' && !!window.localStorage.getItem('ais_mock_auth_passcode');
      
      if (!session && !isLocalStorageStaff) {
        return errorFactory('NO_ACTIVE_SESSION', 'AUTH_ERROR', 'updatePhoto');
      }

      const { uploadWithRetry } = await import('../storage');
      const { imageUrl } = await uploadWithRetry(session?.user?.id || 'staff', id, updates.uri, undefined, undefined, undefined, 3, true);
      updates.image_url = imageUrl;
      updates.updated_at = new Date().toISOString();
      delete updates.uri;
    }

    // 3. Special handling for group cover
    if (updates.is_group_cover === true) {
      let groupId = updates.group_id;
      if (!groupId) {
        const { data } = await supabase
          .from(DB_CONFIG.TABLE_NAME)
          .select('group_id')
          .eq('id', id)
          .maybeSingle();
        if (data?.group_id) groupId = data.group_id;
      }

      if (groupId) {
        await supabase
          .from(DB_CONFIG.TABLE_NAME)
          .update({ is_group_cover: false })
          .eq('group_id', groupId);
      }
    }

    const dbUpdates = mapToDb(updates);
    
    // 4. Update Database
    let { error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .update(dbUpdates)
      .eq('id', id);
      
    if (error && error.message.includes('furniture_items_item_code_key')) {
      console.warn("Item code collision during update, regenerating...");
      const retryUpdates = { ...dbUpdates, item_code: generateItemCode() };
      const { error: retryError } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .update(retryUpdates)
        .eq('id', id);
      error = retryError;
    }
      
    if (error) return errorFactory(error.message, 'DB_ERROR', 'updatePhoto', error);

    // 5. Handle tags
    if ('tag_ids' in updates) {
      await syncPhotoTags(id, safeArray(updates.tag_ids));
    }

    // 6. Handle group member count sync if group_id changed
    if (updates.group_id !== undefined || 'group_id' in updates) {
       const gid = updates.group_id;
       if (gid) {
         const { syncGroupMemberCount } = await import('./commands'); // Recursive-ish but fine for now or move helper
         await syncGroupMemberCount(gid);
       }
    }

    return success(null);
  } catch (err: any) {
    return errorFactory(err.message || 'Update failed', 'UNKNOWN', 'updatePhoto', err);
  }
}

// Alias for legacy support
export const update = updatePhoto;

// --- Batch Update ---
export async function batchUpdate(ids: string[], updates: Partial<Photo>): Promise<AppResult<BatchActionResult>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return errorFactory('Session required', 'AUTH_ERROR', 'batchUpdate');
  const userId = session.user.id;

  const validator = createPhotoValidator();
  const validationRes = validator.validate(updates);
  if (!validationRes.ok) {
    return errorFactory(validationRes.message, 'VALIDATION_ERROR', 'batchUpdate', updates);
  }

  const dbUpdates = mapToDb(updates);
  
  const { data, error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update(dbUpdates)
    .in('id', ids)
    .select('id');

  if (error) {
    // Attempt one-by-one if batch fails (e.g. unique constraint)
    const failedItems: { id: string; reason: string }[] = [];
    let successCount = 0;

    for (const id of ids) {
      const { error: singleError } = await supabase.from(DB_CONFIG.TABLE_NAME).update(dbUpdates).eq('id', id);
      if (singleError) failedItems.push({ id, reason: singleError.message });
      else successCount++;
    }

    return success({ successCount, failureCount: failedItems.length, failedItems });
  }

  const updatedIds = new Set(data?.map(d => d.id) || []);
  const failedOnes = ids.filter(id => !updatedIds.has(id)).map(id => ({ id, reason: 'Not found or unchanged' }));

  // Tags
  if ('tag_ids' in updates) {
    await supabase.from('photo_tags').delete().in('photo_id', ids);
    const uTagIds = safeArray(updates.tag_ids);
    if (uTagIds.length > 0) {
      const tagAssociations = ids.flatMap(photoId => 
        uTagIds.map(tagId => ({
          photo_id: photoId,
          tag_id: tagId
        }))
      );
      await supabase.from('photo_tags').insert(tagAssociations);
    }
  }

  return success({
    successCount: updatedIds.size,
    failureCount: failedOnes.length,
    failedItems: failedOnes
  });
}

// --- Delete ---
export async function deleteMany(ids: string[]): Promise<AppResult<BatchActionResult>> {
    try {
      const response = await api.admin['delete-photos'].$post({ json: { ids } });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Delete failed with HTTP ${response.status}`);
      }
      return success({
        successCount: ids.length,
        failureCount: 0,
        failedItems: []
      });
    } catch(err: any) {
      console.warn('[deleteMany] Admin endpoint failed, falling back to client-side RLS delete:', err);
      const { data, error } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .delete()
        .in('id', ids)
        .select('id');
      
      if (error) return errorFactory(error.message, 'DB_ERROR', 'deleteMany', error);

      const deletedIds = new Set(data?.map(d => d.id) || []);
      const failedItems = ids.filter(id => !deletedIds.has(id)).map(id => ({ id, reason: 'Permission Denied' }));

      return success({
        successCount: deletedIds.size,
        failureCount: failedItems.length,
        failedItems
      });
    }
}

export const deletePhoto = async (photo: Photo): Promise<AppResult<{ dissolvedGroupId?: string }>> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return errorFactory('Session required', 'AUTH_ERROR', 'deletePhoto');
  const userId = session.user.id;

  try {
    const { error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .delete()
      .match({ id: photo.id, user_id: userId });

    if (error) throw error;

    // Physical Cleanup
    if (photo.image_url) {
       const { count } = await supabase
          .from(DB_CONFIG.TABLE_NAME)
          .select('id', { count: 'exact', head: true })
          .eq('image_url', photo.image_url);
        
       if (count === 0) {
          const { cleanupPhysicalStorage } = await import('../storage');
          await cleanupPhysicalStorage([photo.storage_id || photo.id], [photo.image_url]);
       }
    }
    
    let dissolvedGroupId: string | undefined;
    if (photo.group_id) {
      const { data: remaining } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select('id')
        .eq('group_id', photo.group_id);
        
      if (remaining && remaining.length <= 1) {
        await ungroupPhotos(photo.group_id);
        dissolvedGroupId = photo.group_id;
      } else {
        await syncGroupMemberCount(photo.group_id);
      }
    }

    return success({ dissolvedGroupId });
  } catch (err: any) {
    return errorFactory(err.message, 'DB_ERROR', 'deletePhoto', err);
  }
};

// --- Grouping Operations ---

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

  if (countError) return;

  await supabase
    .from('groups')
    .update({ member_count: count || 0 })
    .eq('id', groupId);
};

export const groupPhotos = async (
  photoIds: string[], 
  predefinedGroupId?: string, 
  metadata?: {
    name?: any;
    description?: any;
  }
) => {
  if (photoIds.length <= 1) {
    throw new Error('至少需要选择两张照片才能成组');
  }
  
  const targetGroupId = predefinedGroupId || crypto.randomUUID();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  const { data: selectedPhotos } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('id, group_id')
    .in('id', photoIds);

  const sourceGroupIds = Array.from(new Set(
    selectedPhotos
      ?.map(p => p.group_id)
      .filter((gid): gid is string => !!gid && gid !== targetGroupId) || []
  ));

  const ungroupedValidIds = photoIds.filter(id => {
    const p = selectedPhotos?.find(x => x.id === id);
    return !p?.group_id;
  });

  // Prepare Group Record
  const groupData = {
    name: metadata?.name || { zh: '新合组', en: 'New Combined Group', ms: 'Kumpulan Baru' },
    description: metadata?.description || { zh: '', en: '', ms: '' },
    updated_at: new Date().toISOString()
  };

  const { data: existingGroup } = await supabase.from('groups').select('id').eq('id', targetGroupId).maybeSingle();

  if (!existingGroup) {
    await supabase.from('groups').insert({
      id: targetGroupId,
      user_id: userId,
      is_hidden: false,
      created_at: new Date().toISOString(),
      ...groupData
    });
  } else {
    await supabase.from('groups').update(groupData).eq('id', targetGroupId);
  }

  // Merge
  if (sourceGroupIds.length > 0) {
    await supabase.rpc('merge_groups', {
      source_group_ids: sourceGroupIds,
      target_group_id: targetGroupId
    });
  }

  if (ungroupedValidIds.length > 0) {
    await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .update({ group_id: targetGroupId, is_group_cover: false })
      .in('id', ungroupedValidIds);
  }

  await syncGroupMemberCount(targetGroupId);
  return { newGroupId: targetGroupId };
};

export const updatePhotoHidden = async (photoId: string, is_hidden: boolean): Promise<AppResult<null>> => {
  const res = await updatePhoto(photoId, { is_hidden, updated_at: new Date().toISOString() });
  return res as AppResult<null>;
};

export const updatePhotoHiddenState = updatePhotoHidden;

export const movePhotosToGroup = async (photoIds: string[], targetGroupId: string | null) => {
  const { error } = await supabase.rpc('move_photos_to_group', {
    photo_ids: photoIds,
    target_group_id: targetGroupId
  });
  if (error) throw error;
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

export const setPhotoAsGroupCover = async (photoId: string | null, groupId: string) => {
  if (!groupId) return;

  await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update({ is_group_cover: false })
    .eq('group_id', groupId);

  if (photoId) {
    await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .update({ is_group_cover: true })
      .eq('id', photoId);
  }

  await supabase
    .from('groups')
    .update({ cover_photo_id: photoId || null })
    .eq('id', groupId);
};
