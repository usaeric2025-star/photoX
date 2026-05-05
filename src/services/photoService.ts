import React from 'react';
import { supabase } from '../lib/supabase';
import { DB_CONFIG } from '../constants/config';
import { Photo } from '../types';
import { uploadImages } from './storageService';
import { validateDimension } from '../utils/dimensionValidator';
import { normalizeSearchQuery } from '../utils/stringHelper';

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

    const cat = item.category as Record<string, unknown> | undefined;

    let tagIds: string[] = [];
    if (Array.isArray(item.photo_tags)) {
      tagIds = item.photo_tags
        .map((pt: any) => {
          if (pt == null) return null;
          if (typeof pt === 'object') {
            const typedPt = pt as Record<string, any>;
            if (typedPt.tag_id != null) return String(typedPt.tag_id);
            if (typedPt.tags && (typedPt.tags as Record<string, any>).id != null) return String((typedPt.tags as Record<string, any>).id);
            if (typedPt.id != null) return String(typedPt.id);
          }
          return String(pt);
        })
        .filter((id: string | null) => id != null && id !== 'undefined' && id !== 'null' && id !== '') as string[];
    } else if (Array.isArray(item.tags)) {
      // Fallback in case tags are returned directly
      tagIds = (item.tags as any[])
        .map((t: any) => {
          if (t == null) return null;
          if (typeof t === 'object' && (t as Record<string, any>).id != null) return String((t as Record<string, any>).id);
          return String(t);
        })
        .filter((id: string | null) => id != null && id !== 'undefined' && id !== 'null' && id !== '') as string[];
    }

    return {
      id: item.id as string,
      storageId: storageId,
      item_code: item.item_code as string | undefined,
      manual_code: item.manual_code as string | undefined,
      model_number: item.model_number as string | undefined,
      image_hash: item.image_hash as string | undefined,
      name: (item.name as string) || 'Unnamed Product',
      categoryId: item.category_id ? String(item.category_id) : null,
      manufacturerId: (item.manufacturer_id as string) || null,
      tagIds,
      description: item.description as string | undefined,
      image_url: item.image_url as string | undefined,
      thumb_url: (item.thumb_url as string) || (item.image_url as string),
      dimensions: Array.isArray(item.dimensions) ? (item.dimensions as Photo['dimensions']) : [],
      exif_data: (item.exif_data as Record<string, unknown>) ?? null,
      createdAt: item.created_at as string | undefined,
      groupId: item.group_id as string | undefined,
      isGroupCover: (item.is_group_cover as boolean) || false,
      groupOrder: (item.group_order as number) || 0,
      isHidden: (item.isHidden as boolean) || false,
      userId: item.user_id as string | undefined,
      uri: item.image_url as string | undefined,
      price: (item.price as string) || '',
      description_translations: item.description_translations as Photo['description_translations'] || null
    };
}

function normalizeDimensionsBeforeSave(dimensions: any[] | null | undefined) {
  if (Array.isArray(dimensions)) {
    dimensions.forEach((dim) => {
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
}

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
  console.log(`[Cloud Action] Attempting to clear group_id for all photos in group: ${groupId}`);
  
  const { data, error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .update({ 
      group_id: null, 
      is_pinned: false,
      is_group_cover: false,
      group_order: 0
    })
    .eq('group_id', groupId)
    .select('id');
    
  if (error) {
    console.error(`[DB Error] Failed to clear group_id for group ${groupId}:`, error);
    throw new Error(`清除照片群組關聯失敗: ${error.message} (Code: ${error.code})`);
  }
  
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
  
  if (!data || data.length === 0) {
    const errorMsg = "解散失敗：在雲端找不到對應的照片 ID。請嘗試重新同步或刷新頁面。 (Database match failed)";
    console.error(errorMsg, photoIds);
    throw new Error(errorMsg);
  } else {
    console.log(`Successfully updated ${data.length} photos in cloud.`);
  }
};

export const updatePhoto = async (
  photoId: string, 
  updates: Partial<Photo>, 
  setPhotos?: React.Dispatch<React.SetStateAction<Photo[]>>
): Promise<void> => {
  if (setPhotos) {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, ...updates } : p));
  }
  
  const dbUpdates: any = {};
  if ('categoryId' in updates) dbUpdates.category_id = updates.categoryId;
  if ('manufacturerId' in updates) dbUpdates.manufacturer_id = updates.manufacturerId;
  if ('tagIds' in updates) dbUpdates.tags = updates.tagIds;
  if ('isGroupCover' in updates) dbUpdates.is_group_cover = updates.isGroupCover;
  if ('groupOrder' in updates) dbUpdates.group_order = updates.groupOrder;
  if ('groupId' in updates) dbUpdates.group_id = updates.groupId;
  if ('isPinned' in updates) dbUpdates.is_pinned = updates.isPinned;
  if ('isHidden' in updates) dbUpdates.isHidden = updates.isHidden;
  if ('description_translations' in updates) dbUpdates.description_translations = updates.description_translations;
  
  // Also copy all other standard string fields
  const standardFields = ['name', 'description', 'manual_code', 'model_number', 'dimensions'];
  standardFields.forEach(f => {
    if (f in updates) dbUpdates[f] = (updates as any)[f];
  });
  
  dbUpdates.updated_at = new Date().toISOString();

  try {
    await updatePhotoInCloud(photoId, dbUpdates);
  } catch (err) {
    throw err;
  }
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
    if (error.message.includes('column')) {
       // Try again without group fields if they were the cause
       const safeUpdates = { ...updates };
       let modified = false;
       ['group_id', 'group_order', 'is_group_cover', 'is_hidden', 'updated_at'].forEach(key => {
         if (key in safeUpdates) {
           // Mapping internal keys to DB keys if needed or just skipping if error
         }
       });
       
       // Just basic cleanup if error
       const groupKeys = ['group_id', 'group_order', 'is_group_cover', 'group_metadata'];
       groupKeys.forEach(key => {
         if (key in safeUpdates) {
           delete (safeUpdates as any)[key];
           modified = true;
         }
       });
       
       if (modified) {
         const { error: retryError } = await supabase.from(DB_CONFIG.TABLE_NAME).update(safeUpdates).eq('id', photoId);
         if (!retryError) return;
       }
    }
    throw new Error(error.message || JSON.stringify(error));
  }
};

export const updatePhotoHidden = async (photoId: string, isHidden: boolean) => {
  return updatePhotoInCloud(photoId, { 
    isHidden: isHidden,
    updated_at: new Date().toISOString()
  });
};

export const savePhotoToCloud = async (userId: string, photo: Photo, onStatus?: (s: string) => void): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('No active session for database');
  }

  // Upload image if it doesn't have an image_url yet but has a uri
  if (!photo.image_url && photo.uri) {
    try {
      const filename = photo.storageId || photo.id;
      const { imageUrl, thumbUrl } = await uploadImages(userId, filename, photo.uri, onStatus);
      photo.image_url = imageUrl;
      photo.thumb_url = thumbUrl;
    } catch (e) {
      // Ignored
    }
  }

  // Ensure ID is UUID format
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
    group_order: photo.groupOrder || 0,
    isHidden: photo.isHidden || false,
    updated_at: photo.updatedAt || new Date().toISOString()
  };

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

  // FALLBACK: If group columns are missing in the DB schema, retry without them
  if (dbError && dbError.message.includes('column')) {
    const isGroupError = ['group_id', 'group_order', 'is_group_cover'].some(col => dbError?.message.includes(col));
    
    if (isGroupError) {
      console.warn("DB Schema mismatch detected for group columns, retrying without them...");
      const safePayload = { ...payload };
      delete safePayload.group_id;
      delete safePayload.group_order;
      delete safePayload.is_group_cover;
      
      const retry = await supabase
        .from(DB_CONFIG.TABLE_NAME)
        .upsert(safePayload, { onConflict: 'id', ignoreDuplicates: false })
        .select('id')
        .maybeSingle();
      
      savedPhoto = retry.data;
      dbError = retry.error;
    }
  }

  if (dbError) {
    console.error("Supabase Database Upsert Error:", dbError);
    throw new Error(`數據同步失敗: ${dbError.message}`);
  }

  const finalPhotoId = savedPhoto?.id || photo.id;

  // Update the photo object in-place so callers get the persistent ID
  if (photo.id !== finalPhotoId) {
    photo.id = finalPhotoId;
  }

  // --- Relational Tags Sync ---
  if (Array.isArray(photo.tagIds) && photo.tagIds.length >= 0) {
    // 1. Delete existing associations
    await supabase.from('photo_tags').delete().eq('photo_id', finalPhotoId);
    
    // 2. Insert new associations
    if (photo.tagIds.length > 0) {
      const tagAssociations = photo.tagIds
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
  if (photos.length === 0) return [];

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

  const results: Photo[] = [...photos.map(p => ({ ...p }))];
  const payloads = photos.map(photo => {
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
      group_order: photo.groupOrder || 0,
      isHidden: photo.isHidden || false,
      updated_at: photo.updatedAt || new Date().toISOString()
    };
    if (isUUID) {
      payload.id = photo.id;
    }
    return payload;
  });

  // 1. Bulk Upsert Photos
  const chunkSize = 100;
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
  const photoIdsToUpdate = results.map(p => p.id);
  
  // Wipe existing tags for these photos
  for (let i = 0; i < photoIdsToUpdate.length; i += 100) {
     const chunkIds = photoIdsToUpdate.slice(i, i + 100);
     await supabase.from('photo_tags').delete().in('photo_id', chunkIds);
  }

  // Insert new tags
  const newTagAssociations: any[] = [];
  results.forEach(p => {
    if (Array.isArray(p.tagIds) && p.tagIds.length > 0) {
      p.tagIds.forEach(tid => {
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

  const cloudIds = new Set((cloudItems || []).map(item => item.id));
  
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

export const loadAllPhotosFromCloud = async (
  since?: string, 
  page: number = 0, 
  limit: number = 1000,
  categoryId?: string | null,
  tagId?: string | null,
  searchQuery?: string | null
): Promise<Photo[]> => {
  const selectQuery = tagId 
    ? `
      *,
      photo_tags!inner(*),
      category:categories(*)
    `
    : `
      *,
      photo_tags(*),
      category:categories(*)
    `;

  let query = supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select(selectQuery);
  
  if (since) {
    query = query.gt('updated_at', since);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (tagId) {
    query = query.eq('photo_tags.tag_id', tagId);
  }

  const normSearchQuery = normalizeSearchQuery(searchQuery || '');
  if (normSearchQuery) {
    const q = normSearchQuery;
    // Use an OR condition to search either name, manual_code, or model_number
    query = query.or(`name.ilike.%${q}%,manual_code.ilike.%${q}%,model_number.ilike.%${q}%`);
  }

  const from = page * limit;
  const to = from + limit - 1;

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);
  
  if (error) {
    console.error("[ERROR] Supabase Fetch Error (loadAllPhotosFromCloud):", error);
    return [];
  }

  return (data || []).map(item => mapSupabasePhoto(item));
};

export const getPhotoCount = async (
  categoryId?: string | null,
  tagId?: string | null,
  searchQuery?: string | null
): Promise<number> => {
  let query = supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('*', { count: 'exact', head: true });
  
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (tagId) {
    query = query.eq('photo_tags.tag_id', tagId);
  }

  const normSearchQuery = normalizeSearchQuery(searchQuery || '');
  if (normSearchQuery) {
    const q = normSearchQuery;
    query = query.or(`name.ilike.%${q}%,manual_code.ilike.%${q}%,model_number.ilike.%${q}%`);
  }

  const { count, error } = await query;
  
  if (error) {
    console.error("[ERROR] Supabase Count Error:", error);
    return 0;
  }

  return count || 0;
};

export const loadPhotosFromCloud = async (
  userId: string, 
  since?: string, 
  page: number = 0, 
  limit: number = 1000,
  categoryId?: string | null
): Promise<Photo[]> => {
  let query = supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select(`
      *,
      photo_tags(
        tag_id,
        tags!photo_tags_tag_id_fkey(id, name)
      ),
      category:categories(*)
    `)
    .eq('user_id', userId);

  if (since) {
    query = query.gt('updated_at', since);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const from = page * limit;
  const to = from + limit - 1;

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[ERROR] Supabase Fetch Error (cloud photos):", error);
    return [];
  }

  return (data || []).map(item => mapSupabasePhoto(item));
};

export const deletePhotoFromCloud = async (userId: string, photo: Photo) => {
  const { error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .delete()
    .match({ id: photo.id, user_id: userId });

  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }
};

export const deletePhotosBatch = async (userId: string, photos: Photo[]) => {
  if (photos.length === 0) return;
  
  // 1. Delete DB records
  const ids = photos.map(p => p.id);
  console.log(`[photoService] deletePhotosBatch: Attempting to delete ${ids.length} records. IDs:`, ids);
  
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
  
  console.log(`[photoService] deletePhotosBatch DB success. Rows affected: ${data?.length || 0}`);
  
  // 2. Delete files
  const filePaths = photos.flatMap(p => {
    const filename = p.storageId || p.id;
    return [`public/${filename}.webp`, `public/thumb_${filename}.webp`];
  });
  
  await supabase.storage.from(DB_CONFIG.BUCKET_NAME).remove(filePaths);
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
