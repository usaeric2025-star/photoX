import { supabase } from '../../lib/supabase';
import { STORAGE } from './storageConfig';
import { api } from '@/lib/api';
import { ErrorFactory, success } from '@/lib/error/ErrorFactory';
import { withErrorHandling } from '@/lib/error/wrapper';
import { AppResult } from '@/types/api';
import { compressImage, dataURLToArrayBuffer } from './uploadUtils';

export interface UploadResult {
  imageUrl: string;
  isDuplicate?: boolean;
}

export const uploadWithRetry = async (
  userId: string, 
  photoId: string, 
  base64Data: string,
  imageHash?: string,
  onStatus?: (status: 'compressing' | 'uploading' | 'done') => void,
  onProgress?: (percent: number) => void,
  maxRetries = 3,
  force = false
): Promise<AppResult<UploadResult>> => {
  return withErrorHandling(async () => {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await uploadImages(userId, photoId, base64Data, imageHash, onStatus, onProgress, force);
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
  }, 'uploadWithRetry');
};

export const uploadImages = async (
  userId: string, 
  photoId: string, 
  base64Data: string,
  imageHash?: string,
  onStatus?: (status: 'compressing' | 'uploading' | 'done') => void,
  onProgress?: (percent: number) => void,
  force = false
): Promise<UploadResult> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw ErrorFactory.wrap(new Error('No active session for storage'), 'uploadImages', userId);
  }

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
      json: { 
        photoId: photoId, 
        fileKey: safeFileName, 
        contentType: 'image/webp', 
        imageHash: isMain ? imageHash : undefined,
        force: force
      }
    });
    
    if (presignRes.status === 409) {
        const result = await presignRes.json();
        return `DUPLICATE:${result.existingUrl}`;
    }

    if (!presignRes.ok) {
      throw ErrorFactory.wrap(new Error(`获取预签名上传地址失败 (HTTP ${presignRes.status})`), 'uploadFile', photoId);
    }

    const result = await presignRes.json();
    if (!result.success) throw ErrorFactory.wrap(new Error(String(result.error)), 'uploadFile', photoId);
    
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
      if (!fallbackRes.ok) throw ErrorFactory.wrap(new Error('服务器中转上传失败'), 'uploadFile', photoId);
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
};
