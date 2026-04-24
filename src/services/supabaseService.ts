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
    }
    callback(user);
  });
  return () => subscription.unsubscribe();
};

// --- Storage & DB Operations ---

export const uploadImage = async (userId: string, photoId: string, base64Data: string): Promise<string> => {
  const base64Content = base64Data.split(',')[1];
  const byteCharacters = atob(base64Content);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/jpeg' });

  const fileName = `${userId}/${photoId}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return publicUrl;
};

/**
 * Returns the manual_code if image exists, otherwise null
 */
export const checkImageHashExists = async (userId: string, hash: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('manual_code')
    .eq('image_hash', hash)
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? (data.manual_code || '無手動編號') : null;
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
      exif_data: photo.exif_data || null,
      created_at: photo.createdAt,
      group_id: photo.groupId || null
    }, { onConflict: 'id' });

  if (error) throw error;
};

export const syncPhotosToCloud = async (userId: string, photos: Photo[], onProgress?: (p: number) => void) => {
  let count = 0;
  for (const photo of photos) {
    if (!photo.image_url && photo.uri) {
      photo.image_url = await uploadImage(userId, photo.id, photo.uri);
    }
    await savePhotoToCloud(userId, photo);
    count++;
    if (onProgress) onProgress((count / photos.length) * 100);
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
