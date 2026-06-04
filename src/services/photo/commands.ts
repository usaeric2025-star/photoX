import { supabase } from '../../lib/supabase';
import { DB_CONFIG } from '../../constants/config';
import { Photo } from '../../types';
import { ok, err, type Result } from '@/lib/errorFactory';
import { PAGINATION } from '../../config/constants';
import { safeArray } from '../../lib/utils';
import { mapToDb } from './photoMappingUtils';
import { ungroupPhotos } from './photoMaintenanceService';
import { 
  updatePhotoInCloud as updatePhotoInCloudNew,
  deletePhotoFromCloud as deletePhotoFromCloudNew,
  updatePhotoHiddenState as updatePhotoHiddenNew
} from '../photoMutationService';

export const updatePhotoInCloud = updatePhotoInCloudNew;
export const updatePhotoHidden = updatePhotoHiddenNew;
export const deletePhotoFromCloud = deletePhotoFromCloudNew;

export const updatePhoto = async (
  photoId: string, 
  updates: Partial<Photo>,
  setPhotos?: React.Dispatch<React.SetStateAction<Photo[]>>
): Promise<void> => {
  if (!photoId || photoId.startsWith('temp-')) {
    throw new Error('无效的照片ID，操作被终止');
  }
  const { data: { session } } = await supabase.auth.getSession();
  const isLocalStorageStaff = typeof window !== 'undefined' && !!window.localStorage.getItem('ais_mock_auth_passcode');
  if (!session && !isLocalStorageStaff) throw new Error('NO_ACTIVE_SESSION');

  if (updates.is_group_cover === true) {
    let groupId = updates.group_id;
    if (!groupId) {
      const { data } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select('group_id')
        .eq('id', photoId)
        .maybeSingle();
      if (data?.group_id) {
        groupId = data.group_id;
      }
    }

    if (groupId) {
      await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .update({ is_group_cover: false })
        .eq('group_id', groupId);

      if (setPhotos) {
        setPhotos(prev => prev.map(p => p.group_id === groupId ? { ...p, is_group_cover: false } : p));
      }
    }
  }

  if (updates.uri && updates.uri.startsWith('data:image')) {
    const { uploadImages } = await import('../storage');
    const { imageUrl } = await uploadImages(session?.user?.id || 'staff', photoId, updates.uri, undefined, undefined, undefined, true);
    updates.image_url = imageUrl;
    updates.updated_at = new Date().toISOString();
    delete updates.uri;
  }

  const dbUpdates = mapToDb(updates);
  
  if (setPhotos) setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, ...updates } : p));
  
  await updatePhotoInCloud(photoId, dbUpdates);
  
  if (updates.group_id !== undefined || 'group_id' in updates) {
    const { syncGroupMemberCount } = await import('../photoMutationService');
    const gid = updates.group_id;
    if (gid) await syncGroupMemberCount(gid);
  }
    
  if ('tag_ids' in updates) {
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
};

import { errorFactory, success } from '@/lib/errorFactory';
import type { AppResult } from '@/lib/errorFactory';
// ... other imports

export interface BatchActionResult {
  successCount: number;
  failureCount: number;
  failedItems: { id: string; reason: string }[];
}

export async function deleteMany(ids: string[]): Promise<AppResult<BatchActionResult>> {
    const { data, error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .delete()
      .in('id', ids)
      .select('id');
    
    if (error) {
      // If bulk fails, we might want to try one by one to find why, but for now:
      return errorFactory(error.message, 'DB_ERROR', 'deleteMany', error);
    }

    const deletedIds = new Set(data?.map(d => d.id) || []);
    const failedItems = ids.filter(id => !deletedIds.has(id)).map(id => ({ id, reason: 'Unknown or Permission Denied' }));

    return success({
      successCount: deletedIds.size,
      failureCount: failedItems.length,
      failedItems
    });
}

export async function update(id: string, updates: Partial<Photo>): Promise<AppResult<null>> {
    // Handle URI (image data update) - crucial for rotation save
    if (updates.uri && updates.uri.startsWith('data:image')) {
      const { data: { session } } = await supabase.auth.getSession();
      const isLocalStorageStaff = typeof window !== 'undefined' && !!window.localStorage.getItem('ais_mock_auth_passcode');
      if (!session && !isLocalStorageStaff) {
          return errorFactory('NO_ACTIVE_SESSION', 'AUTH_ERROR', 'update');
      }

      const { uploadImages } = await import('../storage');
      try {
        const { imageUrl } = await uploadImages(session?.user?.id || 'staff', id, updates.uri, undefined, undefined, undefined, true);
        updates.image_url = imageUrl;
        updates.updated_at = new Date().toISOString();
        delete updates.uri;
      } catch (uploadErr: any) {
        return errorFactory(uploadErr.message, 'UPLOAD_FAILED', 'update', uploadErr);
      }
    }

    const dbUpdates = mapToDb(updates);
    const { error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .update(dbUpdates)
      .eq('id', id);
    if (error) return errorFactory(error.message, 'DB_ERROR', 'update', error);

    // If tag_ids is present, update photo_tags relationship
    if ('tag_ids' in updates) {
      const { error: deleteTagsError } = await supabase.from('photo_tags').delete().eq('photo_id', id);
      if (deleteTagsError) {
        console.error('[update/photo_tags] Failed to delete existing tags:', deleteTagsError);
      }
      const uTagIds = safeArray(updates.tag_ids);
      if (uTagIds.length > 0) {
        const tagAssociations = uTagIds.map(tagId => ({
          photo_id: id,
          tag_id: tagId
        }));
        const { error: insertTagsError } = await supabase.from('photo_tags').insert(tagAssociations);
        if (insertTagsError) {
          console.error('[update/photo_tags] Failed to insert new tags:', insertTagsError);
        }
      }
    }

    return success(null);
}

export async function batchUpdate(ids: string[], updates: Partial<Photo>): Promise<AppResult<BatchActionResult>> {
    const dbUpdates = mapToDb(updates);
    const { data, error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .update(dbUpdates)
      .in('id', ids)
      .select('id');

    if (error) {
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

export const deletePhotosBatch = async (
  userId: string, 
  photos: Photo[], 
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal
) => {
  const sPhotos = safeArray<Photo>(photos);
  if (sPhotos.length === 0) return;
  
  const total = sPhotos.length;
  const BATCH_SIZE = PAGINATION.DEFAULT_PAGE_SIZE;
  const affectedGroupIds = new Set<string>();
  
  for (let i = 0; i < sPhotos.length; i += BATCH_SIZE) {
    if (signal?.aborted) throw new Error('Operation aborted');
    
    const chunk = sPhotos.slice(i, i + BATCH_SIZE);
    const ids = chunk.map(p => p.id).filter(id => id && !id.startsWith('temp-'));
    if (ids.length === 0) continue;

    chunk.forEach(p => { if (p.group_id) affectedGroupIds.add(p.group_id); });
    
    const { error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .delete()
      .in('id', ids)
      .eq('user_id', userId);
    
    if (error) {
      throw new Error(error.message || JSON.stringify(error));
    }
    
    const potentiallyDeletable = chunk.filter(p => !!p.image_url);
    const keysToRemove: string[] = [];
    const urlsToRemove: string[] = [];
    
    for (const p of potentiallyDeletable) {
      if (!p.image_url) continue;
      const { count } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select('*', { count: 'exact', head: true })
        .eq('image_url', p.image_url);
      
      if (count === 0) {
        const filename = p.storage_id || p.id;
        keysToRemove.push(filename);
        urlsToRemove.push(p.image_url);
      }
    }
    
    if (keysToRemove.length > 0) {
        // Actually, let's keep it consistent with what was in photos.ts
        const { cleanupPhysicalStorage: cleanup } = await import('../storage');
        await cleanup(keysToRemove, urlsToRemove);
    }
    
    if (onProgress) onProgress(Math.min(i + BATCH_SIZE, total), total);
  }
  
  if (affectedGroupIds.size > 0) {
    for (const groupId of affectedGroupIds) {
      const { data: remaining } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select('id')
        .eq('group_id', groupId);
        
      if (remaining && remaining.length <= 1) {
        await ungroupPhotos(groupId);
      } else if (remaining) {
        const { syncGroupMemberCount } = await import('../photoMutationService');
        await syncGroupMemberCount(groupId);
      }
    }
  }
};

export const groupPhotos = async (photoIds: string[], predefinedGroupId?: string, expandGroups: boolean = false) => {
  if (photoIds.length <= 1) {
    throw new Error('至少需要选择两张照片才能成组');
  }
  const groupId = predefinedGroupId || crypto.randomUUID();
  let isNewGroup = false;

  // 1. Get previous group_ids for the selected photos
  const validIds = photoIds.filter(id => id && !id.startsWith('temp-'));
  const { data: selectedPhotos } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('id, group_id')
    .in('id', validIds);

  const previousGroupIds = Array.from(new Set(
    selectedPhotos
      ?.map(p => p.group_id)
      .filter((gid): gid is string => !!gid) || []
  ));

  // 2. Expand groups if requested
  let finalPhotoIds = [...photoIds];
  if (expandGroups && previousGroupIds.length > 0) {
    const { data: groupPhotosData } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id')
      .in('group_id', previousGroupIds);

    if (groupPhotosData) {
      finalPhotoIds = Array.from(new Set([
        ...photoIds,
        ...groupPhotosData.map(p => p.id)
      ]));
    }
  }

  // 3. Check if group already exists in the groups table
  const { data: existingGroup } = await supabase
    .from('groups')
    .select('id')
    .eq('id', groupId)
    .maybeSingle();

  const coverPhotoId = finalPhotoIds[0] || null;

  if (!existingGroup) {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    const { error: insertError } = await supabase
      .from('groups')
      .insert({
        id: groupId,
        name: 'Unset Group',
        name_en: 'New Combined Group',
        name_ms: 'Kumpulan Baru',
        description: '',
        colors: [],
        materials: [],
        is_hidden: false,
        user_id: userId,
        member_count: finalPhotoIds.length,
        cover_photo_id: coverPhotoId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (insertError) {
      console.error('[groupPhotos] Failed to create group in database:', insertError);
      throw new Error(`创建合并群组失败: ${insertError.message || JSON.stringify(insertError)}`);
    }
    isNewGroup = true;
  }

  // 4. Update group_id and is_group_cover for the photos in supabase
  const updatePromises = [];
  if (coverPhotoId) {
    updatePromises.push(
      updatePhotosGroupInCloud([coverPhotoId], {
        group_id: groupId,
        is_group_cover: true
      })
    );
  }
  
  const nonCoverIds = finalPhotoIds.filter(id => id !== coverPhotoId);
  if (nonCoverIds.length > 0) {
    updatePromises.push(
      updatePhotosGroupInCloud(nonCoverIds, {
        group_id: groupId,
        is_group_cover: false
      })
    );
  }

  await Promise.all(updatePromises);
  
  // 5. Cleanup the previous groups that lost elements
  if (previousGroupIds.length > 0) {
    const { syncGroupMemberCount, ungroupPhotos } = await import('../photoMutationService');
    for (const prevGid of previousGroupIds) {
      if (prevGid === groupId) continue;

      const { data: remaining } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select('id')
        .eq('group_id', prevGid);

      if (!remaining || remaining.length <= 1) {
        await ungroupPhotos(prevGid);
      } else {
        await syncGroupMemberCount(prevGid);
      }
    }
  }

  if (!isNewGroup) {
    const { syncGroupMemberCount } = await import('../photoMutationService');
    await syncGroupMemberCount(groupId);
  }

  // Return structure that fits expected output or results
  return { finalPhotoIds, newGroupId: groupId };
};

export const removePhotosFromGroup = async (photoIds: string[], groupId: string) => {
  if (photoIds.length === 0) return;

  await updatePhotosGroupInCloud(photoIds, { 
    group_id: null,
    is_group_cover: false,
    is_pinned: false
  });

  const { syncGroupMemberCount } = await import('../photoMutationService');

  const { data: remainingPhotos, error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('id')
    .eq('group_id', groupId);

  if (!error && remainingPhotos) {
    if (remainingPhotos.length <= 1) {
      await ungroupPhotos(groupId);
    } else {
      await syncGroupMemberCount(groupId);
    }
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

export const updatePhotosGroup = updatePhotosGroupInCloud;
export const setPhotoAsGroupCoverInCloud = async (photoId: string | null, groupId: string) => {
  if (!groupId) return;

  const { error: unsetError } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update({ is_group_cover: false })
    .eq('group_id', groupId);

  if (unsetError) {
    throw new Error(unsetError.message || JSON.stringify(unsetError));
  }

  if (photoId) {
    const validPhotoId = photoId && !photoId.startsWith('temp-');
    if (validPhotoId) {
      const { error: setError } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .update({ is_group_cover: true })
        .eq('id', photoId);

      if (setError) {
        throw new Error(setError.message || JSON.stringify(setError));
      }
    }
  }

  await supabase
    .from('groups')
    .update({ cover_photo_id: photoId || null })
    .eq('id', groupId);
};
