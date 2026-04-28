import { supabase, BUCKET_NAME, TABLE_NAME } from './client';
import { Photo } from '../types';
import { uploadImages } from './storageService';

export function mapSupabasePhoto(item: any): Photo {
    if (!item) return {} as Photo;
    
    // Extract storageId from image_url if possible
    let storageId = item.id;
    if (item.image_url) {
      try {
        const parts = item.image_url.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart) {
          storageId = lastPart.split('.')[0];
        }
      } catch (e) {
        console.warn("Failed to parse storageId from URL:", e);
      }
    }

    const cat = item.category;

    let tagIds: string[] = [];
    if (Array.isArray(item.photo_tags)) {
      tagIds = item.photo_tags
        .map((pt: any) => {
          if (pt == null) return null;
          if (typeof pt === 'object') {
            if (pt.tag_id != null) return String(pt.tag_id);
            if (pt.tags && pt.tags.id != null) return String(pt.tags.id);
            if (pt.id != null) return String(pt.id);
          }
          return String(pt);
        })
        .filter((id: string | null) => id != null && id !== 'undefined' && id !== 'null' && id !== '') as string[];
    } else if (Array.isArray(item.tags)) {
      // Fallback in case tags are returned directly
      tagIds = item.tags
        .map((t: any) => {
          if (t == null) return null;
          if (typeof t === 'object' && t.id != null) return String(t.id);
          return String(t);
        })
        .filter((id: string | null) => id != null && id !== 'undefined' && id !== 'null' && id !== '') as string[];
    }

    return {
      id: item.id,
      storageId: storageId,
      item_code: item.item_code,
      manual_code: item.manual_code,
      image_hash: item.image_hash,
      name: item.name,
      categoryId: item.category_id ? String(item.category_id) : null,
      categoryName: cat?.name,
      categoryZh: cat?.zh,
      categoryEn: cat?.en,
      categoryMs: cat?.ms,
      subcategoryId: item.sub_category || null,
      tagIds,
      description: item.description,
      image_url: item.image_url,
      thumb_url: item.thumb_url,
      dimensions: item.dimensions,
      exif_data: item.exif_data,
      createdAt: item.created_at,
      groupId: item.group_id,
      isGroupCover: item.is_group_cover || false,
      groupOrder: item.group_order || 0,
      isHidden: item.is_hidden || false,
      userId: item.user_id,
      uri: item.image_url
    };
}

export const checkImageHashExists = async (hash: string): Promise<{image_url: string, manual_code: string} | null> => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
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

export const updatePhotosGroupInCloud = async (photoIds: string[], groupId: string | null) => {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ group_id: groupId })
    .in('id', photoIds);
    
  if (error) {
    if (error.message.includes('group_id') && error.message.includes('column')) {
      console.warn("Skipping group sync as group_id column appears missing in DB");
      return;
    }
    console.error("Failed to update group id:", error);
    throw error;
  }
};

export const updatePhotoInCloud = async (photoId: string, updates: Partial<any>) => {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', photoId);
    
  if (error) {
    if (error.message.includes('column')) {
       // Try again without group fields if they were the cause
       const safeUpdates = { ...updates };
       let modified = false;
       ['group_id', 'group_order', 'is_group_cover'].forEach(key => {
         if (key in safeUpdates) {
           delete (safeUpdates as any)[key];
           modified = true;
         }
       });
       
       if (modified) {
         const { error: retryError } = await supabase.from(TABLE_NAME).update(safeUpdates).eq('id', photoId);
         if (!retryError) return;
       }
    }
    console.error("Failed to update photo in cloud:", error);
    throw error;
  }
};

export const updatePhotoHidden = async (photoId: string, isHidden: boolean) => {
  return updatePhotoInCloud(photoId, { is_hidden: isHidden });
};

export const savePhotoToCloud = async (userId: string, photo: Photo): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('No active session for database');
  }

  // Upload image if it doesn't have an image_url yet but has a uri
  if (!photo.image_url && photo.uri) {
    try {
      const filename = photo.storageId || photo.id;
      const { imageUrl, thumbUrl } = await uploadImages(userId, filename, photo.uri);
      photo.image_url = imageUrl;
      photo.thumb_url = thumbUrl;
    } catch (e) {
      console.warn("Failed to upload image before auto-saving to DB:", e);
    }
  }

  // Ensure ID is UUID format
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(photo.id);
  
  const payload: any = {
    user_id: session.user.id,
    item_code: photo.item_code,
    manual_code: photo.manual_code || '',
    image_hash: photo.image_hash,
    name: photo.name,
    category_id: photo.categoryId || null,
    sub_category: photo.subcategoryId || '',
    // Deprecating JSON tags field in favor of photo_tags table
    description: photo.description || '',
    image_url: photo.image_url,
    thumb_url: photo.thumb_url || null,
    dimensions: photo.dimensions || null,
    model_number: photo.model_number || '',
    created_at: photo.createdAt,
    group_id: photo.groupId || null,
    is_group_cover: photo.isGroupCover || false,
    group_order: photo.groupOrder || 0
  };

  if (isUUID) {
    payload.id = photo.id;
  }

  // Upsert on photo as before
  let { data: savedPhoto, error: dbError } = await supabase
    .from(TABLE_NAME)
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
        .from(TABLE_NAME)
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

export const syncPhotosToCloud = async (
  userId: string, 
  photos: Photo[], 
  lastSyncTime?: string, 
  onProgress?: (p: number) => void
): Promise<{success: number, skipped: number}> => {
  let successCount = 0;
  let skippedCount = 0;
  
  // 1. Get current cloud state
  let query = supabase
    .from(TABLE_NAME)
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
      console.log(`Cleaning up ${itemsToDelete.length} orphan items from cloud...`);
      for (const item of itemsToDelete) {
        try {
          await supabase.from(TABLE_NAME).delete().match({ id: item.id, user_id: userId });
          const filename = item.storageId || item.id;
          await supabase.storage.from(BUCKET_NAME).remove([`public/${filename}.webp`, `public/thumb_${filename}.webp`]);
        } catch (e) {
          console.warn(`Failed to delete orphan ${item.id}:`, e);
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
        const { imageUrl, thumbUrl } = await uploadImages(userId, filename, photo.uri);
        photo.image_url = imageUrl;
        photo.thumb_url = thumbUrl;
        
        if (photo.image_hash) {
          hashUrlMap.set(photo.image_hash, { imageUrl, thumbUrl });
        }
      }
      
      const wasSaved = await savePhotoToCloud(userId, photo);
      if (wasSaved) {
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

export const loadAllPhotosFromCloud = async (): Promise<Photo[]> => {
  console.log("Fetching all cloud photos...");
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(`
      *,
      photo_tags(
        tag_id,
        tags(id, name)
      ),
      category:categories(*)
    `)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("Supabase Fetch Error (loadAllPhotosFromCloud):", error);
    throw error;
  }

  console.log(`loadAllPhotosFromCloud: Found ${data?.length || 0} items.`);
  return (data || []).map(item => mapSupabasePhoto(item));
};

export const loadPhotosFromCloud = async (userId: string): Promise<Photo[]> => {
  console.log("Fetching cloud photos for user:", userId);
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(`
      *,
      photo_tags(
        tag_id,
        tags(id, name)
      ),
      category:categories(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Supabase Fetch Error (cloud photos):", error);
    throw error;
  }

  console.log(`Found ${data?.length || 0} photos in cloud for user ${userId}`);
  return (data || []).map(item => mapSupabasePhoto(item));
};

export const deletePhotoFromCloud = async (userId: string, photo: Photo) => {
  console.log(`Attempting to delete photo ${photo.id} for user ${userId} from cloud...`);
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .match({ id: photo.id, user_id: userId });

  if (error) {
    console.error(`Supabase deletion error for photo ${photo.id}:`, error);
    throw error;
  }
  
  console.log(`Successfully deleted record ${photo.id} from database. Now removing file from storage...`);
  const filename = photo.storageId || photo.id;
  // Delete both original and thumbnail
  await supabase.storage.from(BUCKET_NAME).remove([`public/${filename}.webp`, `public/thumb_${filename}.webp`]);
  console.log(`Storage deletion complete for ${filename}.`);
};

export const deduplicatePhotos = async (userId?: string): Promise<{removed: number}> => {
  try {
    // 1. Get all photos and group them by user and hash
    let query = supabase
      .from(TABLE_NAME)
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
            await supabase.from(TABLE_NAME).delete().eq('id', duplicate.id);
            
            // Only remove from storage if it's NOT the same physical file as the original
            // AND no other record (from any user) is using this file
            if (duplicate.image_url && duplicate.image_url !== original.image_url) {
                // Check if any other record still uses this URL
                const { count } = await supabase
                    .from(TABLE_NAME)
                    .select('*', { count: 'exact', head: true })
                    .eq('image_url', duplicate.image_url);
                
                if (count === 0) {
                    const filename = duplicate.storageId || duplicate.id;
                    await supabase.storage.from(BUCKET_NAME).remove([`public/${filename}.webp`]);
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
