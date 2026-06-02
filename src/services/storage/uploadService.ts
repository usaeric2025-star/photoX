import { supabase } from '../../lib/supabase';
import { STORAGE } from './storageConfig';
import { api } from '@/lib/api';
import { StandardError } from '@/lib/validators/protocol';

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
    img.onerror = () => reject(new Error('图片加载到画布失败，请确保文件格式完整且是有效的图片'));
    img.src = base64Data;
  });
};

function dataURLToArrayBuffer(dataurl: string): { buffer: ArrayBuffer; mime: string } {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/webp';
  if (arr.length < 2) {
    throw new Error('Invalid data URL format');
  }
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return { buffer: u8arr.buffer, mime };
}

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
      let buffer: ArrayBuffer;
      try {
        const parsed = dataURLToArrayBuffer(base64);
        buffer = parsed.buffer;
      } catch (err: any) {
        console.warn('[uploadService] dataURLToArrayBuffer failed, falling back to fetch', err);
        const res = await fetch(base64);
        const blob = await res.blob();
        buffer = await blob.arrayBuffer();
      }

      let safeFileName = fileName.replace('public/', '');
      if (safeFileName.startsWith('temp-')) {
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
        safeFileName = `upload_${timestamp}_${Math.random().toString(36).substring(7)}.webp`;
      }

      const presignRes = await api['upload-presign'].$post({
        json: { photoId: photoId, fileKey: safeFileName, contentType: 'image/webp' }
      });
      
      if (!presignRes.ok) {
        throw new Error('Failed to get presigned upload URL from backend');
      }

      const result = await presignRes.json();
      if (!result.success) throw new Error(result.error);
      const { uploadUrl, publicUrl } = result.data;

      try {
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
      } catch (browserUploadErr) {
        console.warn(`[uploadService] Browser direct upload to R2 failed (likely due to CORS policy or network). Retrying via server-proxied fallback...`, browserUploadErr);
        // Fallback: upload full base64 to server-proxied direct endpoint
        const fallbackRes = await api['upload-direct'].$post({
          json: {
            base64Data: base64,
            fileKey: safeFileName,
            contentType: 'image/webp'
          }
        });

        if (!fallbackRes.ok) {
          throw new Error(`Server-proxied direct upload fallback failed with HTTP ${fallbackRes.status}`);
        }

        const fallbackResult = await fallbackRes.json();
        if (!fallbackResult.success) {
          throw new Error(fallbackResult.error || `Server-proxied direct upload fallback failed`);
        }

        if (isMain && onProgress) onProgress(100);
        return fallbackResult.data.publicUrl;
      }
    };

    const imageUrl = await uploadFile(originalBase64, `public/${photoId}.webp`, true);
    const thumbUrl = await uploadFile(thumbBase64, `public/thumb_${photoId}.webp`, false);

    return { imageUrl, thumbUrl };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new StandardError(`图片处理异常: ${message}`, { 
      originalError: error,
      aiDebugHint: `[uploadToR2] 底層異常: ${message}` 
    })
  }
};
