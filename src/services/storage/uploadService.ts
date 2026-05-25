import { supabase } from '../../lib/supabase';
import { STORAGE } from './storageConfig';

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
  onStatus?: (status: 'compressing' | 'uploading' | 'done') => void,
  onProgress?: (percent: number) => void,
  force = false
): Promise<{imageUrl: string, thumbUrl: string}> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('No active session for storage');
  }

  try {
    onStatus?.('compressing');
    const originalBase64 = await compressImage(base64Data, 2048, 0.85); 
    let thumbBase64: string;
    try {
        thumbBase64 = await compressImage(base64Data, 400, 0.6);
    } catch (e: unknown) {
        if ((e as Error).name === 'QuotaExceededError') {
             thumbBase64 = originalBase64;
        } else {
             throw e;
        }
    }

    onStatus?.('uploading');
    const uploadFile = async (base64: string, fileName: string, isMain=false) => {
      const res = await fetch(base64);
      const blob = await res.blob();
      const buffer = await blob.arrayBuffer();

      let safeFileName = fileName.replace('public/', '');
      if (safeFileName.startsWith('temp-')) {
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
        safeFileName = `upload_${timestamp}_${Math.random().toString(36).substring(7)}.webp`;
      }

      const presignRes = await fetch('/api/upload-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: photoId, contentType: 'image/webp' })
      });

      if (!presignRes.ok) {
        throw new Error('Failed to get presigned upload URL from backend');
      }

      const result = await presignRes.json();
      if (!result.success) throw new Error(result.error);
      const { uploadUrl, publicUrl } = result.data;

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/webp' },
        body: new Uint8Array(buffer)
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload to R2 failed: ${uploadRes.statusText}`);
      }

      if (isMain && onProgress) onProgress(100);
      
      return publicUrl;
    };

    const imageUrl = await uploadFile(originalBase64, `public/${photoId}.webp`, true);
    const thumbUrl = await uploadFile(thumbBase64, `public/thumb_${photoId}.webp`, false);

    return { imageUrl, thumbUrl };
  } catch (err: unknown) {
    console.error("Image processing or upload failed:", err);
    let errorMessage = '请检查网络';
    if (err instanceof Error) {
        errorMessage = err.message;
    } else if (typeof err === 'string') {
        errorMessage = err;
    } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String((err as any).message);
    }
    throw new Error(`图片处理异常: ${errorMessage}`);
  }
};
