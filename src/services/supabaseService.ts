import { createClient } from '@supabase/supabase-js';
import { Photo, Category, Tag, DB_Category } from '../types';
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
    const thumbBase64 = await compressImage(base64Data, 300, 0.5);

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

export const savePhotoToCloud = async (userId: string, photo: Photo): Promise<boolean> => {
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
  const newId = isUUID ? photo.id : crypto.randomUUID();

  // Upsert on item_code as requested, ignoring duplicates
  const { data, error: dbError } = await supabase
    .from(TABLE_NAME)
    .upsert({
      id: newId,
      user_id: session.user.id,
      item_code: photo.item_code,
      manual_code: photo.manual_code || '',
      image_hash: photo.image_hash,
      name: photo.name,
      category: photo.category,
      sub_category: photo.sub_category || '',
      tags: Array.isArray(photo.tags) ? photo.tags : [],
      description: photo.description || '',
      image_url: photo.image_url,
      thumb_url: photo.thumb_url || null,
      dimensions: photo.dimensions || null,
      model_number: photo.model_number || '',
      created_at: photo.createdAt,
      group_id: photo.groupId || null
    }, { 
      onConflict: 'id',
      ignoreDuplicates: false 
    })
    .select('id');

  if (dbError) {
    console.error("Supabase Database Upsert Error:", dbError);
    throw new Error(`數據同步失敗: ${dbError.message}`);
  }

  // If ignoreDuplicates is true, data will be empty if it was a duplicate
  return data && data.length > 0;
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
        } else {
          // 2nd fallback Global check if not found locally (optional, but good for total dedup)
          const existingInfo = await checkImageHashExists(photo.image_hash);
          if (existingInfo && !cloudIds.has(photo.id)) {
              console.log(`Found existing image globally for hash ${photo.image_hash}, reuse URL.`);
              photo.image_url = existingInfo.image_url;
              hashUrlMap.set(photo.image_hash, { imageUrl: existingInfo.image_url });
          }
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
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;

  return (data || []).map(item => {
    // Extract storageId from image_url if possible
    let storageId = item.id;
    if (item.image_url) {
      const parts = item.image_url.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        storageId = lastPart.split('.')[0];
      }
    }

    return {
      id: item.id,
      storageId: storageId,
      item_code: item.item_code,
      manual_code: item.manual_code,
      image_hash: item.image_hash,
      name: item.name,
      category: item.category,
      categoryId: item.category,
      sub_category: item.sub_category,
      subcategoryId: item.sub_category,
      tags: item.tags,
      description: item.description,
      image_url: item.image_url,
      dimensions: item.dimensions,
      exif_data: item.exif_data,
      createdAt: item.created_at,
      groupId: item.group_id,
      userId: item.user_id,
      // Local fallbacks
      uri: item.image_url, 
      tagIds: item.tags || []
    };
  });
};

export const loadPhotosFromCloud = async (userId: string): Promise<Photo[]> => {
  console.log("Fetching cloud photos for user:", userId);
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Supabase Fetch Error (cloud photos):", error);
    throw error;
  }

  console.log(`Found ${data?.length || 0} photos in cloud for user ${userId}`);

  return (data || []).map(item => {
    // Extract storageId from image_url if possible
    let storageId = item.id;
    if (item.image_url) {
      const parts = item.image_url.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        storageId = lastPart.split('.')[0];
      }
    }

    return {
      id: item.id,
      storageId: storageId,
      item_code: item.item_code,
      manual_code: item.manual_code,
      image_hash: item.image_hash,
      name: item.name,
      category: item.category,
      categoryId: item.category, // Map accurately for UI
      sub_category: item.sub_category,
      subcategoryId: item.sub_category, // Map accurately for UI
      tags: item.tags,
      tagIds: item.tags, // Map accurately for UI
      description: item.description,
      image_url: item.image_url,
      dimensions: item.dimensions,
      exif_data: item.exif_data,
      createdAt: item.created_at,
      groupId: item.group_id,
      userId: item.user_id,
      uri: item.image_url
    };
  });
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
  await supabase.storage.from(BUCKET_NAME).remove([`public/${filename}.webp`]);
  console.log(`Storage deletion complete for ${filename}.`);
};

// --- Settings Sync ---

export const loadCategoriesFromCloud = async (): Promise<DB_Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error("Failed to load categories:", error);
    return [];
  }
  return data || [];
};

export const fetchSettings = async () => {
    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();
    
    if (error && error.code !== 'PGRST116') { // Ignore "no rows returned" error
        console.error("Failed to fetch settings:", error);
        return null;
    }
    
    const settings = data || null;
    if (!settings) return null;
    
    // Map custom columns back to app expectations
    if (settings.api_key) settings.gemini_api_key = settings.api_key;
    if (settings.model_name) settings.custom_model = settings.model_name;
    if (settings.access_passcode) settings.internal_password = settings.access_passcode;
    
    // Parse JSON data if it exists
    if (settings.categories_json) {
      try { settings.categories = JSON.parse(settings.categories_json); } catch(e) { console.error(e); }
    }
    if (settings.tags_json) {
      try { settings.tags = JSON.parse(settings.tags_json); } catch(e) { console.error(e); }
    }
    if (settings.manufacturers_json) {
      try { settings.manufacturers = JSON.parse(settings.manufacturers_json); } catch(e) { console.error(e); }
    }
    
    return settings;
};

export const saveSettings = async (settings: any) => {
    try {
        // Prepare the payload
        const payload = { ...settings };
        
        // Map fields to requested columns
        if ('gemini_api_key' in payload) {
            payload.api_key = payload.gemini_api_key;
            delete payload.gemini_api_key;
        }
        if ('custom_model' in payload) {
            payload.model_name = payload.custom_model;
            delete payload.custom_model;
        }
        if ('internal_password' in payload) {
            payload.access_passcode = payload.internal_password;
            payload.passcode_enabled = !!payload.internal_password;
            delete payload.internal_password;
        }

        // Clean up temporary UI fields before saving
        if (payload.categories) {
          payload.categories_json = JSON.stringify(payload.categories);
          delete payload.categories;
        }
        if (payload.tags) {
          payload.tags_json = JSON.stringify(payload.tags);
          delete payload.tags;
        }
        if (payload.manufacturers) {
          payload.manufacturers_json = JSON.stringify(payload.manufacturers);
          delete payload.manufacturers;
        }

        console.log("Attempting to save settings to Supabase...", payload);

        // Upsert into row with id: 1
        const { error: upsertError } = await supabase
            .from('settings')
            .upsert({ ...payload, id: 1 }, { onConflict: 'id' });
            
        if (upsertError) {
            console.error("Error upserting settings:", upsertError);
            throw upsertError;
        }
        
        return true;
    } catch (err: any) {
        console.error("Detailed error in saveSettings:", err);
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

