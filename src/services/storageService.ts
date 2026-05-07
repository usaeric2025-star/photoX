import { supabase } from '../lib/supabase';
import { DB_CONFIG } from '../constants/config';

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
      const result = canvas.toDataURL('image/webp', quality);
      
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

export const uploadImages = async (
  userId: string, 
  photoId: string, 
  base64Data: string,
  onStatus?: (status: 'compressing' | 'uploading' | 'done') => void
): Promise<{imageUrl: string, thumbUrl: string}> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('No active session for storage');
  }

  try {
    // Generate versions with compression
    onStatus?.('compressing');
    const originalBase64 = await compressImage(base64Data, 1200, 0.8);
    let thumbBase64;
    try {
        thumbBase64 = await compressImage(base64Data, 300, 0.5);
    } catch (e: any) {
        if (e.name === 'QuotaExceededError') {
             thumbBase64 = originalBase64;
        } else {
             throw e;
        }
    }

    onStatus?.('uploading');
    const uploadFile = async (base64: string, fileName: string) => {
      const res = await fetch(base64);
      const blob = await res.blob();
      
      const { error: storageError } = await supabase.storage
        .from(DB_CONFIG.BUCKET_NAME)
        .upload(fileName, blob, {
          contentType: 'image/webp',
          upsert: true
        });

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from(DB_CONFIG.BUCKET_NAME)
        .getPublicUrl(fileName);
      
      return publicUrl;
    };

    const imageUrl = await uploadFile(originalBase64, `public/${photoId}.webp`);
    const thumbUrl = await uploadFile(thumbBase64, `public/thumb_${photoId}.webp`);

    return { imageUrl, thumbUrl };
  } catch (err: any) {
    console.error("Image processing or upload failed:", err);
    throw new Error(`图片处理异常: ${err.message || '请检查网络'}`);
  }
};
