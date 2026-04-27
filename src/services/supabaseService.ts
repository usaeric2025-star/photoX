import { createClient } from '@supabase/supabase-js';
import { Photo, Category, Tag } from '../types';
import SparkMD5 from 'spark-md5';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://vbpnlkeweqkjufijtdph.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_mXZxsfqH-fATbT2g9fiX7A_-VfzOwa8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET_NAME = 'furniture_images';
const TABLE_NAME = 'furniture_items';

// --- Utils ---
export const calculateMD5 = (base64Data: string): string => {
  try {
    const base64Content = base64Data.split(',')[1];
    return SparkMD5.hashBinary(atob(base64Content));
  } catch (e) {
    console.error("MD5 calculation error:", e);
    return `ERR-${Date.now()}`;
  }
};

// Helper to map Supabase item to Photo type
function mapSupabasePhoto(item: any): Photo {
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

    // 确保 tagIds 是字符串数组
    const tagIds = (item.photo_tags || [])
      .map((pt: any) => String(pt.tag_id))
      .filter(Boolean);

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
      tagIds: tagIds.length > 0 ? tagIds : [],  // 至少是空数组
      description: item.description,
      image_url: item.image_url,
      dimensions: item.dimensions,
      exif_data: item.exif_data,
      createdAt: item.created_at,
      groupId: item.group_id,
      userId: item.user_id,
      uri: item.image_url
    };
}

export const calculateMD5FromFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const spark = new SparkMD5.ArrayBuffer();
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        spark.append(e.target.result);
        resolve(spark.end());
      } else {
        reject(new Error('File read result is not ArrayBuffer'));
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
};

export const calculateMD5FromArrayBuffer = (buffer: ArrayBuffer): string => {
  return SparkMD5.ArrayBuffer.hash(buffer);
};

export const generateItemCode = (): string => {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FUR-${date}-${random}`;
};

// --- Auth ---
export const loginWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/admin'
    }
  });

  if (error) throw error;
  return null;
};

export const logout = () => supabase.auth.signOut();

export const onAuthChange = (callback: (user: any) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user || null;
    if (user) {
      (user as any).displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.displayName || user.email;
      (user as any).avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
    }
    callback(user);
  });
  return () => subscription.unsubscribe();
};

// --- Storage & DB Operations ---

export const compressImage = (base64Data: string, maxWidth = 1920, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const result = canvas.toDataURL('image/jpeg', quality);
      
      // Free memory
      canvas.width = 0;
      canvas.height = 0;
      img.src = '';
      
      resolve(result);
    };
    img.onerror = (err) => reject(err);
    img.src = base64Data;
  });
};

export const uploadImages = async (userId: string, photoId: string, base64Data: string): Promise<{imageUrl: string, thumbUrl: string}> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('No active session for storage');
  }

  try {
    // Generate versions with compression
    const originalBase64 = await compressImage(base64Data, 1200, 0.8);
    let thumbBase64;
    try {
        thumbBase64 = await compressImage(base64Data, 300, 0.5);
    } catch (e: any) {
        if (e.name === 'QuotaExceededError') {
             console.warn("Storage quota exceeded, using original as thumbnail");
             thumbBase64 = originalBase64;
        } else {
             throw e;
        }
    }

    const uploadFile = async (base64: string, fileName: string) => {
      const res = await fetch(base64);
      const blob = await res.blob();
      
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);
      
      return publicUrl;
    };

    const imageUrl = await uploadFile(originalBase64, `public/${photoId}.webp`);
    const thumbUrl = await uploadFile(thumbBase64, `public/thumb_${photoId}.webp`);

    return { imageUrl, thumbUrl };
  } catch (err: any) {
    console.error("Image processing or upload failed:", err);
    throw new Error(`圖片處理異常: ${err.message || '請檢查網絡'}`);
  }
};

/**
 * Returns existing photo info if a photo with the same hash exists, otherwise null
 */
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

/**
 * Clean up duplicate photos based on hash.
 * This runs per user to prevent one user's data from being deleted by another user's duplicate.
 * Keeps the oldest record and removes others.
 */
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
    group_id: photo.groupId || null
  };

  if (isUUID) {
    payload.id = photo.id;
  }

  // Upsert on photo as before
  const { data: savedPhoto, error: dbError } = await supabase
    .from(TABLE_NAME)
    .upsert(payload, { 
      onConflict: 'id',
      ignoreDuplicates: false 
    })
    .select('id')
    .single();

  if (dbError) {
    console.error("Supabase Database Upsert Error:", dbError);
    throw new Error(`數據同步失敗: ${dbError.message}`);
  }

  const finalPhotoId = savedPhoto.id;

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

export const syncPhotosToCloud = async (userId: string, photos: Photo[], onProgress?: (p: number) => void): Promise<{success: number, skipped: number}> => {
  let successCount = 0;
  let skippedCount = 0;
  
  // 1. Get current cloud state (hashes specifically for better matching)
  const { data: cloudItems, error: fetchError } = await supabase
    .from(TABLE_NAME)
    .select('id, storageId, image_hash, image_url, thumb_url')
    .eq('user_id', userId);
  
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
  if (!fetchError) {
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
      photo_tags(tag_id),
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
      photo_tags(tag_id),
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

// --- Settings Sync ---

export const loadCategoriesFromCloud = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error("Failed to load categories:", error);
    throw error;
  }
  return data || [];
};

export const loadTagsFromCloud = async (): Promise<Tag[]> => {
    const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });
    
    if (error) {
        console.error("Failed to load tags from cloud:", error);
        throw error;
    }
    return data || [];
};

export const updateTagInDB = async (tagId: string, name: string): Promise<boolean> => {
    const { error } = await supabase
        .from('tags')
        .update({ name })
        .eq('id', tagId);
    
    if (error) {
        console.error("Failed to update tag:", error);
        return false;
    }
    return true;
};

export const deleteTagFromDB = async (tagId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);
    
    if (error) {
        console.error("Failed to delete tag from cloud:", error);
        return false;
    }
    return true;
};

export const fetchSettings = async () => {
    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();
    
    if (error) {
        console.error("Failed to fetch settings:", error);
        throw error;
    }
    
    // Map custom columns back to app expectations
    if (data) {
        if (data.api_key) data.gemini_api_key = data.api_key;
        if (data.model_name) data.custom_model = data.model_name;
        if (data.access_passcode) data.internal_password = data.access_passcode;
    }
    
    return data;
};

export const saveSettings = async (settings: any) => {
    try {
        const payload = { ...settings };
        
        // Map fields to requested columns
        if (payload.gemini_api_key) {
            payload.api_key = payload.gemini_api_key;
            delete payload.gemini_api_key;
        }
        if (payload.custom_model) {
            payload.model_name = payload.custom_model;
            delete payload.custom_model;
        }
        if (payload.internal_password) {
            payload.access_passcode = payload.internal_password;
            delete payload.internal_password;
        }
        
        console.log("Saving settings to Supabase...", payload);

        const { error: upsertError } = await supabase
            .from('settings')
            .upsert({ ...payload, id: 1 }, { onConflict: 'id' });
            
        if (upsertError) {
            console.error("Error upserting settings:", upsertError);
            throw upsertError;
        }
        
        return true;
    } catch (err: any) {
        console.error("Error in saveSettings:", err);
        throw err;
    }
};

export const uploadLogo = async (file: File) => {
    // Using the same bucket as photos for better reliability
    const bucketName = BUCKET_NAME; 
    const fileName = `app/logo-${Date.now()}.webp`;
    
    try {
        const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file, { upsert: true });

        if (uploadError) {
            console.error("Supabase Logo Upload Error:", uploadError);
            throw new Error(`Logo 上傳失敗: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        console.log("Logo uploaded successfully, URL:", publicUrl);

        // Update settings table with new logo_url
        const { error: updateError } = await supabase
            .from('settings')
            .update({ logo_url: publicUrl })
            .eq('id', 1);

        if (updateError) {
            console.error("Failed to update logo url in settings:", updateError);
        }

        return publicUrl;
    } catch (err: any) {
        console.error("Logo upload process error:", err);
        throw err;
    }
};

// --- New DB-driven ID generation helpers ---

/**
 * Get a fresh UUID from the database
 */
export const getDatabaseUUID = async (): Promise<string> => {
  const { data, error } = await supabase.rpc('get_uuid_v4');
  if (!error && data) return data;
  return crypto.randomUUID(); 
};

export const addTagToDB = async (name: string): Promise<Tag> => {
    const { data, error } = await supabase
        .from('tags')
        .insert({ name, aliases: [] })
        .select()
        .single();
    if (error) {
        console.error("Failed to add tag:", error);
        throw error;
    }
    return data;
};

export const addManufacturerToDB = async (name: string): Promise<any> => {
    const { data, error } = await supabase
        .from('manufacturers')
        .insert({ name, aliases: [] })
        .select()
        .single();
    if (error) {
        console.error("Failed to add manufacturer:", error);
        throw error;
    }
    return data;
};

