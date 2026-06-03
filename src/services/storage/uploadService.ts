import { supabase } from '../../lib/supabase';
import { STORAGE } from './storageConfig';
import { api } from '@/lib/api';
import { StandardError } from '@/lib/validators/protocol';
import { extractErrorMessage } from '@/lib/error/errorHandler';

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

export const uploadWithRetry = async (
  userId: string, 
  photoId: string, 
  base64Data: string,
  imageHash?: string,
  onStatus?: (status: 'compressing' | 'uploading' | 'done') => void,
  onProgress?: (percent: number) => void,
  maxRetries = 3
): Promise<{imageUrl: string, isDuplicate?: boolean}> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadImages(userId, photoId, base64Data, imageHash, onStatus, onProgress);
    } catch (err) {
      lastError = err;
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        console.warn(`[Upload] Attempt ${i + 1} failed, retrying in ${delay}ms...`, err);
      }
    }
  }
  throw lastError;
};

export const uploadImages = async (
  userId: string, 
  photoId: string, 
  base64Data: string,
  imageHash?: string,
  onStatus?: (status: 'compressing' | 'uploading' | 'done') => void,
  onProgress?: (percent: number) => void,
  force = false
): Promise<{imageUrl: string, isDuplicate?: boolean}> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('No active session for storage');
  }

  try {
    onStatus?.('compressing');
    const originalBase64 = await compressImage(base64Data, 2048, 0.85); 

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
        json: { photoId: photoId, fileKey: safeFileName, contentType: 'image/webp', imageHash: isMain ? imageHash : undefined }
      });
      
      if (presignRes.status === 409) {
          const result = await presignRes.json();
          return `DUPLICATE:${result.existingUrl}`;
      }

      if (!presignRes.ok) {
        throw new Error(`获取预签名上传地址失败 (HTTP ${presignRes.status})`);
      }

      const result = await presignRes.json();
      if (!result.success) throw new Error(String(result.error));
      
      const { uploadUrl, publicUrl } = result.data;

      try {
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/webp' },
          body: new Uint8Array(buffer)
        });
        if (isMain && onProgress) onProgress(100);
        return publicUrl;
      } catch (browserUploadErr: any) {
        const fallbackRes = await api['upload-direct'].$post({
          json: { base64Data: base64, fileKey: safeFileName, contentType: 'image/webp' }
        });
        if (!fallbackRes.ok) throw new Error('服务器中转上传失败');
        const fallbackResult = await fallbackRes.json();
        if (isMain && onProgress) onProgress(100);
        return fallbackResult.data.publicUrl;
      }
    };

    const imageUrlResult = await uploadFile(originalBase64, `public/${photoId}.webp`, true);
    
    if (imageUrlResult.startsWith('DUPLICATE:')) {
       return { imageUrl: imageUrlResult.replace('DUPLICATE:', ''), isDuplicate: true };
    }

    return { imageUrl: imageUrlResult };
  } catch (error: unknown) {
    const message = extractErrorMessage(error);
    throw new StandardError(`图片处理异常: ${message}`, { 
      originalError: error,
      aiDebugHint: `[uploadToR2] 底層異常: ${message}` 
    })
  }
};
