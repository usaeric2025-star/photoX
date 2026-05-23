import { supabase } from '../lib/supabase';
import { DB_CONFIG } from '../constants/config';
import { Photo } from '../types';
import { normalizeSearchQuery } from '../utils/stringHelper';
import { VISIBILITY_OR_QUERY } from '../constants/photoConstants';
import { globalHandleError } from '../utils/errorHandler';
import { PAGINATION } from '../config/constants';
import { safeArray } from '../lib/utils';
import { mapToDb, normalizeDimensionsBeforeSave } from './photo/photoMappingUtils';

export * from './photo/photoMappingUtils';
export * from './photo/photoUploadService';
export * from './photo/photoMaintenanceService';

export function mapSupabasePhoto(item: Record<string, unknown>): Photo {
    if (!item) return {} as Photo;
    
    // Extract storageId from image_url if possible
    let storageId = item.id as string;
    if (item.image_url) {
      try {
        const parts = (item.image_url as string).split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart) {
          storageId = lastPart.split('.')[0];
        }
      } catch (e) {
        // Suppress warning
      }
    }

    let tag_ids: string[] = [];
    if (Array.isArray(item.photo_tags)) {
      tag_ids = item.photo_tags
        .map((pt: { tag_id?: string | number; tags?: { id: string | number }; id?: string | number }) => {
          if (pt == null) return null;
          if (typeof pt === 'object') {
            const typedPt = pt;
            if (typedPt.tag_id != null) return String(typedPt.tag_id);
            if (typedPt.tags && typedPt.tags.id != null) return String(typedPt.tags.id);
            if (typedPt.id != null) return String(typedPt.id);
          }
          return String(pt);
        })
        .filter((id: string | null) => id != null && id !== 'undefined' && id !== 'null' && id !== '') as string[];
    } else if (Array.isArray(item.tags)) {
      // Fallback in case tags are returned directly
      tag_ids = (item.tags as { id: string | number }[])
        .map((t: { id?: string | number } | string | number) => {
          if (t == null) return null;
          if (typeof t === 'object' && t.id != null) return String(t.id);
          return String(t);
        })
        .filter((id: string | null) => id != null && id !== 'undefined' && id !== 'null' && id !== '') as string[];
    }

    const group_id = item.group_id ? String(item.group_id) : undefined;
    const created_at = item.created_at as string | undefined;
    const updated_at = item.updated_at as string | undefined;
    const is_group_cover = !!item.is_group_cover;
    const is_pinned = !!item.is_pinned || !!(item as any).is_pinned;
    const is_analyzing = !!item.is_analyzing;
    const group_order = item.group_order as number | undefined;
    const user_id = item.user_id ? String(item.user_id) : undefined;
    const category_id = item.category_id ? String(item.category_id) : null;
    const manufacturer_id = item.manufacturer_id ? String(item.manufacturer_id) : null;
    
    return {
      id: String(item.id),
      storage_id: storageId,
      item_code: item.item_code as string | undefined,
      manual_code: item.manual_code as string | undefined,
      model_number: item.model_number as string | undefined,
      image_hash: item.image_hash as string | undefined,
      name: (item.name as string) || 'Unnamed Product',
      category_id: category_id,
      manufacturer_id: manufacturer_id,
      description: item.description as string | undefined,
      image_url: item.image_url as string | undefined,
      thumb_url: (item.thumb_url as string) || (item.image_url as string),
      thumb_hash: item.thumb_hash as string | undefined,
      exif_data: (item.exif_data as Record<string, unknown>) ?? null,
      created_at: created_at,
      updated_at: updated_at,
      group_id: group_id,
      is_group_cover: is_group_cover,
      is_hidden: !!item.is_hidden,
      is_pinned: is_pinned,
      is_analyzing: is_analyzing,
      group_order: group_order,
      user_id: user_id,
      uri: item.image_url as string | undefined,
      price: item.price ? String(item.price) : '',
      description_translations: item.description_translations as Photo['description_translations'] || null,
      tag_ids: Array.isArray(tag_ids) ? tag_ids : [],
      dimensions: Array.isArray(item.dimensions) ? (item.dimensions as Photo['dimensions']) : [],
      created_at_timestamp: item.created_at_timestamp as number | undefined
    };
}

const PHOTO_SELECT_FIELDS = 'id, name, item_code, manual_code, model_number, image_hash, category_id, manufacturer_id, sub_category, description, image_url, thumb_url, thumb_hash, created_at, updated_at, group_id, is_group_cover, is_hidden, is_pinned, is_analyzing, user_id, price, description_translations, dimensions, group_order, photo_tags(tag_id)';

export const loadAllPhotosFromCloud = async (
    since?: string,
    page: number = 0,
    limit: number = 1000,
    categoryId?: string | null,
    tagId?: string | null,
    searchQuery?: string | null,
    isAdminMode: boolean = false,
    signal?: AbortSignal,
    sortOrder?: 'asc' | 'desc' | 'newest' | 'oldest' | 'name' | string | null
): Promise<Photo[]> => {
    const selectQuery = PHOTO_SELECT_FIELDS;

    let query = supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select(selectQuery);

  if (signal) {
    query = query.abortSignal(signal);
  }

  if (!isAdminMode) {
    query = query.or(VISIBILITY_OR_QUERY);
  }

  if (since) {
    query = query.gt('updated_at', since);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (tagId) {
    const { data: ptData } = await supabase.from('photo_tags').select('photo_id').eq('tag_id', tagId);
    const photoIdsWithTag = (ptData || []).map(pt => String(pt.photo_id));
    if (photoIdsWithTag.length > 0) {
      query = query.in('id', photoIdsWithTag);
    } else {
      // If no matching tag, result is empty
      return [];
    }
  }

  const normSearchQuery = normalizeSearchQuery(searchQuery || '');
  if (normSearchQuery) {
    // Escape special characters for ILIKE: %, _, \
    const q = normSearchQuery.replace(/[\\%_]/g, '\\$&');
    
    // Resolve matching tags & categories to improve Supabase OR filtering
    const [tagsRes, catsRes] = await Promise.all([
      supabase.from('tags').select('id').ilike('name', `%${q}%`),
      supabase.from('categories').select('id').or(`name.ilike.%${q}%,zh.ilike.%${q}%,en.ilike.%${q}%,ms.ilike.%${q}%`)
    ]);

    const tagIds = (tagsRes.data || []).map(t => t.id);
    const catIds = (catsRes.data || []).map(c => c.id);

    let photoIdsFromTags: string[] = [];
    if (tagIds.length > 0) {
      const { data: ptData } = await supabase.from('photo_tags').select('photo_id').in('tag_id', tagIds);
      if (ptData) photoIdsFromTags = ptData.map(pt => pt.photo_id);
    }

    let orSegments = [
      `name.ilike.%${q}%`,
      `manual_code.ilike.%${q}%`,
      `model_number.ilike.%${q}%`,
      `description.ilike.%${q}%`,
      `item_code.ilike.%${q}%`
    ];

    if (catIds.length > 0) {
      orSegments.push(`category_id.in.(${catIds.join(',')})`);
    }

    if (photoIdsFromTags.length > 0) {
      orSegments.push(`id.in.(${photoIdsFromTags.join(',')})`);
    }

    query = query.or(orSegments.join(','));
  }

  const from = page * limit;
  const to = from + limit - 1;

  query = query.order('is_pinned', { ascending: false, nullsFirst: false });
  query = query.order('group_order', { ascending: true, nullsFirst: false });
  if (isAdminMode) {
    query = query.order('is_hidden', { ascending: true, nullsFirst: true });
  }
  
  if (sortOrder === 'oldest' || sortOrder === 'asc') {
    query = query.order('created_at', { ascending: true })
                 .order('id', { ascending: true });
  } else if (sortOrder === 'name') {
    query = query.order('name', { ascending: true, nullsFirst: true })
                 .order('created_at', { ascending: false });
  } else {
    // Default: newest
    query = query.order('created_at', { ascending: false })
                 .order('id', { ascending: false });
  }

  const { data, error } = await query.range(from, to);

    if (error) {
        throw error;
    }

    return (data || []).map(item => mapSupabasePhoto(item));
};

export const loadPhotosByGroupId = async (groupId: string, isAdminMode: boolean = false): Promise<Photo[]> => {
    if (!groupId) return [];

    try {
        const { data, error } = await supabase.rpc('get_group_with_photos', { group_uuid: groupId });
        if (error) {
            console.warn('get_group_with_photos RPC failed, falling back to query', error);
            throw error;
        }
        if (data) {
            const rows = Array.isArray(data) ? data : (data.photos || []);
            // For public mode, we could manually filter here just in case the RPC doesn't do it
            let photos = rows.map((item: any) => mapSupabasePhoto(item));
            if (!isAdminMode) {
               photos = photos.filter(p => !p.is_hidden);
            }
            return photos;
        }
    } catch (e) {
        // Fallback: normal query
    }

    let query = supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select(PHOTO_SELECT_FIELDS)
        .eq('group_id', groupId);

    if (!isAdminMode) {
        query = query.or(VISIBILITY_OR_QUERY);
    }

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    return (data || []).map(item => mapSupabasePhoto(item));
};


export const loadPhotosByGroupIdPaginated = async (
  groupId: string,
  page: number = 1,
  pageSize: number = PAGINATION.GROUP_PAGE_SIZE,
  isAdminMode: boolean = false
): Promise<{ photos: Photo[]; total: number }> => {
  if (!groupId) return { photos: [], total: 0 };

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const { data, error } = await supabase.rpc('get_group_with_photos', { group_uuid: groupId });
    if (error) throw error;
    if (data) {
       const rows = Array.isArray(data) ? data : (data.photos || []);
       let photos = rows.map((item: any) => mapSupabasePhoto(item));
       if (!isAdminMode) {
          photos = photos.filter(p => !p.is_hidden);
       }
       // handle pagination locally if RPC returns all items
       const paginatedPhotos = photos.slice(from, to + 1);
       return { photos: paginatedPhotos, total: photos.length || data.total_count || 0 };
    }
  } catch (e) {
     console.warn("RPC get_group_with_photos failed for paginated:", e);
     // Fallback
  }

  let countQuery = supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId);

  let query = supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select(PHOTO_SELECT_FIELDS)
    .eq('group_id', groupId);

  if (!isAdminMode) {
    countQuery = countQuery.or(VISIBILITY_OR_QUERY);
    query = query.or(VISIBILITY_OR_QUERY);
  }

  const [countRes, queryRes] = await Promise.all([
    countQuery,
    query.order('is_group_cover', { ascending: false })
         .order('created_at', { ascending: false })
         .range(from, to)
  ]);

  if (queryRes.error) {
    throw queryRes.error;
  }

  const mapped = (queryRes.data || []).map(item => mapSupabasePhoto(item));
  return { photos: mapped, total: countRes.count || 0 };
};

export const getPhotoCount = async (
  categoryId?: string | null,
  tagId?: string | null,
  searchQuery?: string | null,
  isAdminMode: boolean = false
): Promise<number> => {
  let query = supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select(tagId ? 'id, photo_tags!inner(tag_id)' : 'id', { count: 'exact', head: true });
  
  if (!isAdminMode) {
    query = query.or(VISIBILITY_OR_QUERY);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (tagId) {
    const { data: ptData } = await supabase.from('photo_tags').select('photo_id').eq('tag_id', tagId);
    const photoIdsWithTag = (ptData || []).map(pt => String(pt.photo_id));
    if (photoIdsWithTag.length > 0) {
      query = query.in('id', photoIdsWithTag);
    } else {
      return 0;
    }
  }

  const normSearchQuery = normalizeSearchQuery(searchQuery || '');
  if (normSearchQuery) {
    // Escape special characters for ILIKE: %, _, \
    const q = normSearchQuery.replace(/[\\%_]/g, '\\$&');
    
    // Resolve matching tags & categories to improve Supabase OR filtering
    const [tagsRes, catsRes] = await Promise.all([
      supabase.from('tags').select('id').ilike('name', `%${q}%`),
      supabase.from('categories').select('id').or(`name.ilike.%${q}%,zh.ilike.%${q}%,en.ilike.%${q}%,ms.ilike.%${q}%`)
    ]);

    const tagIds = (tagsRes.data || []).map(t => t.id);
    const catIds = (catsRes.data || []).map(c => c.id);

    let photoIdsFromTags: string[] = [];
    if (tagIds.length > 0) {
      const { data: ptData } = await supabase.from('photo_tags').select('photo_id').in('tag_id', tagIds);
      if (ptData) photoIdsFromTags = ptData.map(pt => pt.photo_id);
    }

    let orSegments = [
      `name.ilike.%${q}%`,
      `manual_code.ilike.%${q}%`,
      `model_number.ilike.%${q}%`,
      `description.ilike.%${q}%`,
      `item_code.ilike.%${q}%`
    ];

    if (catIds.length > 0) {
      orSegments.push(`category_id.in.(${catIds.join(',')})`);
    }

    if (photoIdsFromTags.length > 0) {
      orSegments.push(`id.in.(${photoIdsFromTags.join(',')})`);
    }

    query = query.or(orSegments.join(','));
  }

  const { count, error } = await query;
  
  if (error) {
    throw error;
  }

  return count || 0;
};

export const getPhotosWithoutThumbHash = async (): Promise<{ id: string }[]> => {
  const { data, error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('id')
    .is('thumb_hash', null);

  if (error) {
    throw new Error(error.message);
  }
  return data || [];
};




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

  // If we are setting this photo as a group cover, we must UN-SET all other photos in the same group first!
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
      // Unset all other photos in the same group in the cloud
      await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .update({ is_group_cover: false })
        .eq('group_id', groupId);

      if (setPhotos) {
        setPhotos(prev => prev.map(p => p.group_id === groupId ? { ...p, is_group_cover: false } : p));
      }
    }
  }

  // If a new base64 image (rotated/edited) is provided, upload it and update image URLs
  if (updates.uri && updates.uri.startsWith('data:image')) {
    const { uploadImages } = await import('./storageService');
    const { imageUrl, thumbUrl } = await uploadImages(session.user.id, photoId, updates.uri, undefined, undefined, true);
    updates.image_url = imageUrl;
    updates.thumb_url = thumbUrl;
    updates.updated_at = new Date().toISOString();
    delete updates.uri;
  }

  const dbUpdates = mapToDb(updates);
  
  if (setPhotos) setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, ...updates } : p));
  
  await updatePhotoInCloud(photoId, dbUpdates);
    
  // Sync tags if needed
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
  const groupId = photo.group_id;
  
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
    const filesToRemove: string[] = [];
    
    for (const p of potentiallyDeletable) {
      const { count } = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select('*', { count: 'exact', head: true })
        .eq('image_url', p.image_url);
      
      if (count === 0) {
        const filename = p.storage_id || p.id;
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

export const setPhotoAsGroupCoverInCloud = async (photoId: string | null, groupId: string) => {
  if (!groupId) return;

  // 1. Unset cover for all other photos in the same group
  const { error: unsetError } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update({ is_group_cover: false })
    .eq('group_id', groupId);

  if (unsetError) {
    throw new Error(unsetError.message || JSON.stringify(unsetError));
  }

  // 2. Set cover for selected target photo if specified
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

  // 3. Update the groups table's cover_photo_id to keep them in perfect sync
  await supabase
    .from('groups')
    .update({ cover_photo_id: photoId || null })
    .eq('id', groupId);
};
