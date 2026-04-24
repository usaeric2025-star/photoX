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
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (err) => reject(err);
  });
};

export const uploadImage = async (userId: string, photoId: string, base64Data: string): Promise<string> => {
  let finalData = base64Data;
  
  // Compress if too large (approx check based on base64 string length)
  if (base64Data.length > 5 * 1024 * 1024) {
    try {
      finalData = await compressImage(base64Data);
    } catch (e) {
      console.warn("Compression failed, uploading original:", e);
    }
  }

  try {
    const res = await fetch(finalData);
    const blob = await res.blob();

    const fileName = `${userId}/${photoId}.jpg`;
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error("Supabase Storage Upload Error details:", error);
      alert('Storage 上傳失敗詳情: ' + JSON.stringify(error, null, 2));
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (err: any) {
    console.error("Blob conversion or upload failed:", err);
    alert('圖片處裡或上傳失敗: ' + (err.message || JSON.stringify(err)));
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

export const savePhotoToCloud = async (userId: string, photo: Photo) => {
  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert({
      id: photo.id,
      user_id: userId,
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
    }, { onConflict: 'id' });

  if (error) {
    console.error("Supabase Database Insert Error:", error);
    const errorDetails = {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      tableName: TABLE_NAME,
      photoId: photo.id
    };
    alert('資料庫寫入失敗詳情: ' + JSON.stringify(errorDetails, null, 2));
    throw error;
  }
};

export const syncPhotosToCloud = async (userId: string, photos: Photo[], onProgress?: (p: number) => void) => {
  let count = 0;
  for (const photo of photos) {
    try {
      if (!photo.image_url && photo.uri) {
        photo.image_url = await uploadImage(userId, photo.id, photo.uri);
      }
      await savePhotoToCloud(userId, photo);
      count++;
      if (onProgress) onProgress((count / photos.length) * 100);
    } catch (err: any) {
      console.error(`Sync failed for photo ${photo.id}:`, err);
      alert(`照片同步失敗 (ID: ${photo.id.substring(0, 8)}): ` + (err.message || JSON.stringify(err)));
      // Continue with next photo or stop? Stopping is safer for error visibility.
      throw err;
    }
  }
};

export const loadPhotosFromCloud = async (userId: string): Promise<Photo[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(item => ({
    id: item.id,
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
  }));
};

export const deletePhotoFromCloud = async (userId: string, photoId: string) => {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .match({ id: photoId, user_id: userId });

  if (error) throw error;
  
  await supabase.storage.from(BUCKET_NAME).remove([`${userId}/${photoId}.jpg`]);
};

// --- Settings Sync ---
export const syncCategoriesToCloud = async (userId: string, categories: Category[]) => {
  const { error } = await supabase
    .from('categories')
    .upsert(categories.map(c => ({ ...c, user_id: userId })), { onConflict: 'id' });
  if (error) throw error;
};

export const syncTagsToCloud = async (userId: string, tags: Tag[]) => {
  const { error } = await supabase
    .from('tags')
    .upsert(tags.map(t => ({ ...t, user_id: userId })), { onConflict: 'id' });
  if (error) throw error;
};

export const loadCategoriesFromCloud = async (userId: string): Promise<Category[]> => {
  const { data, error } = await supabase.from('categories').select('*').eq('user_id', userId);
  if (error) throw error;
  return data as Category[];
};

export const loadTagsFromCloud = async (userId: string): Promise<Tag[]> => {
  const { data, error } = await supabase.from('tags').select('*').eq('user_id', userId);
  if (error) throw error;
  return data as Tag[];
};
