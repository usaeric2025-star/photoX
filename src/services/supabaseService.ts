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
  const base64Content = base64Data.split(',')[1];
  return SparkMD5.hashBinary(atob(base64Content));
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
      redirectTo: window.location.origin
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
    img.src = base64Data;
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
      resolve(canvas.toDataURL('image/webp', quality));
    };
    img.onerror = (err) => reject(err);
  });
};

export const uploadImage = async (userId: string, photoId: string, base64Data: string): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('No active session for storage');
  }

  let finalData = base64Data;
  
  // Stricter compression: if over 2MB, compress. (base64 is ~1.37x larger than blob)
  const estimatedSize = (base64Data.length * 3) / 4;
  if (estimatedSize > 2 * 1024 * 1024) {
    try {
      finalData = await compressImage(base64Data, 1920, 0.7);
      console.log("Image compressed due to size > 2MB");
    } catch (e) {
      console.warn("Compression failed, uploading original:", e);
    }
  }

  try {
    const res = await fetch(finalData);
    const blob = await res.blob();

    const fileName = `public/${photoId}.webp`;
    
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, blob, {
        contentType: 'image/webp',
        upsert: true
      });

    if (storageError) {
      console.error("Supabase Storage Upload Error details:", storageError);
      throw new Error(`儲存空間上傳失敗: ${storageError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (err: any) {
    console.error("Blob conversion or upload failed:", err);
    if (!err.message?.includes('儲存空間')) {
      throw new Error(`圖片處理異常: ${err.message || '請檢查網絡'}`);
    }
    throw err;
  }
};

/**
 * Returns the manual_code if image exists, otherwise null
 */
export const checkImageHashExists = async (userId: string, hash: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('manual_code')
      .eq('image_hash', hash)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? (data.manual_code || '無手動編號') : null;
  } catch (err) {
    console.error("Hash check failed:", err);
    return null;
  }
};

export const savePhotoToCloud = async (userId: string, photo: Photo): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('No active session for database');
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
      tags: photo.tags || [],
      description: photo.description || '',
      image_url: photo.image_url,
      dimensions: photo.dimensions || null,
      created_at: photo.createdAt,
      group_id: photo.groupId || null
    }, { 
      onConflict: 'item_code',
      ignoreDuplicates: true 
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
  
  // 1. Get current cloud state
  const { data: cloudItems, error: fetchError } = await supabase
    .from(TABLE_NAME)
    .select('id, storageId')
    .eq('user_id', userId);
  
  if (fetchError) {
    console.error("Failed to fetch cloud items for comparison:", fetchError);
  } else {
    // 2. Identify cloud items that are NOT in the local list
    const localIds = new Set(photos.map(p => p.id));
    const itemsToDelete = (cloudItems || []).filter(item => !localIds.has(item.id));
    
    if (itemsToDelete.length > 0) {
      console.log(`Cleaning up ${itemsToDelete.length} orphan items from cloud...`);
      for (const item of itemsToDelete) {
        try {
          await supabase.from(TABLE_NAME).delete().match({ id: item.id, user_id: userId });
          const filename = item.storageId || item.id;
          await supabase.storage.from(BUCKET_NAME).remove([`public/${filename}.webp`]);
        } catch (e) {
          console.warn(`Failed to delete orphan ${item.id}:`, e);
        }
      }
    }
  }

  // 3. Process uploads
  for (const photo of photos) {
    try {
      if (!photo.image_url && photo.uri) {
        const filename = photo.storageId || photo.id;
        photo.image_url = await uploadImage(userId, filename, photo.uri);
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
      sub_category: item.sub_category,
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
      sub_category: item.sub_category,
      tags: item.tags,
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
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .match({ id: photo.id, user_id: userId });

  if (error) throw error;
  
  const filename = photo.storageId || photo.id;
  await supabase.storage.from(BUCKET_NAME).remove([`public/${filename}.webp`]);
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
        .limit(1);
    
    if (error) {
        console.error("Failed to fetch settings:", error);
        return null;
    }
    
    const settings = data && data.length > 0 ? data[0] : null;
    if (!settings) return null;
    
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
        if (payload.categories_json) console.log("Categories string length:", payload.categories_json.length);
        if (payload.tags_json) console.log("Tags string length:", payload.tags_json.length);

        // First, check if there's any row in settings
        const { data: existingRows, error: fetchError } = await supabase
            .from('settings')
            .select('*')
            .limit(1);

        if (fetchError) {
            console.error("Error checking existing settings:", fetchError);
            throw fetchError;
        }

        if (existingRows && existingRows.length > 0) {
            // Row exists, try to update it
            const existing = existingRows[0];
            const updatePayload = { ...payload };
            
            // Try updating using 'id' if it exists in the data we fetched
            if (existing.id !== undefined) {
                const { error: updateError } = await supabase
                    .from('settings')
                    .update(updatePayload)
                    .eq('id', existing.id);
                
                if (updateError) throw updateError;
            } else {
                // If no 'id', try to update everything (risky if multiple rows, but likely there's only one)
                // Use the first available column as a matcher if possible, or just upsert without onConflict
                const { error: upsertError } = await supabase
                    .from('settings')
                    .upsert({ ...updatePayload, id: 1 }); // Still try id: 1 as fallback
                
                if (upsertError) throw upsertError;
            }
        } else {
            // No row exists, insert as id: 1
            const { error: insertError } = await supabase
                .from('settings')
                .insert({ ...payload, id: 1 });
            
            if (insertError) throw insertError;
        }
        
        return true;
    } catch (err: any) {
        console.error("Detailed error in saveSettings:", err);
        // Provide the user with a specific message if columns/id are missing
        if (err.message && err.message.includes("column \"id\" of relation \"settings\" does not exist")) {
            console.error("MIGRATION REQUIRED: The 'settings' table is missing the 'id' column.");
        }
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

