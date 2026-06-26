import { logger } from '@/lib/logger';
import { supabase } from '../../lib/supabase';
import { STORAGE } from './storageConfig';
import { api } from '@/lib/api';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { compressImage, dataURLToArrayBuffer } from './uploadUtils';

export interface UploadResult {
  imageUrl: string;
  isDuplicate?: boolean;
}

export const uploadWithRetry = async (
  userId: string = '', 
  photoId: string, 
  fileOrBase64: File | string,
  imageHash?: string,
  onStatus?: (status: 'compressing' | 'uploading' | 'done') => void,
  onProgress?: (percent: number) => void,
  maxRetries = 3,
  force = false
): Promise<UploadResult> => {
    let lastError: unknown;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await uploadImages(userId, photoId, fileOrBase64, imageHash, onStatus, onProgress, force);
      } catch (err) {
        lastError = err;
        
        // 🚨 PREVENT FUTILE RETRIES: If it's a permission / unauthorized error, fail fast and don't retry!
        const errObj = err as Record<string, unknown>;
        const isAuthError = err instanceof Error && (
          err.message.includes('No active session') || 
          err.message.includes('鑒權失敗') || 
          err.message.includes('Unauthorized') || 
          err.message.includes('401') ||
          err.message.includes('403') ||
          errObj.statusCode === 401 ||
          errObj.statusCode === 403 ||
          errObj.code === 'PERMISSION_DENIED' ||
          errObj.category === 'auth'
        );
        
        if (isAuthError) {
          logger.error(`[Upload] Auth/Permission error occurred. Failing fast without retry.`, err);
          break;
        }

        if (i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          logger.warn(`[Upload] Attempt ${i + 1} failed, retrying in ${delay}ms...`, err);
        }
      }
    }
    if (lastError instanceof Error && lastError.name === 'AppError') throw lastError;
    throw ErrorFactory.fatal(lastError instanceof Error ? lastError.message : String(lastError), { context: 'uploadWithRetry' });
};

const uploadImages = async (
  userId: string = '', 
  photoId: string, 
  fileOrBase64: File | string,
  imageHash?: string,
  onStatus?: (status: 'compressing' | 'uploading' | 'done') => void,
  onProgress?: (percent: number) => void,
  force = false
): Promise<UploadResult> => {
  // Rely on backend API authorization check (via requireRealUser on upload-presign)
  
  let dataToUpload: File | string = fileOrBase64;
  let ext = 'webp';
  let mimeType = 'image/webp';
  
  if (typeof fileOrBase64 === 'string') {
      onStatus?.('compressing');
      dataToUpload = await compressImage(fileOrBase64, 2048, 0.85); 
  } else {
      ext = fileOrBase64.name.split('.').pop() || 'jpg';
      mimeType = fileOrBase64.type || 'image/jpeg';
  }

  onStatus?.('uploading');
  const uploadFile = async (data: File | string, fileName: string, isMain=false) => {
    let body: BodyInit;
    let fallbackBase64 = '';
    
    if (data instanceof File) {
        body = data;
    } else {
        fallbackBase64 = data;
        let buffer: ArrayBuffer;
        try {
          const parsed = dataURLToArrayBuffer(data);
          buffer = parsed.buffer;
        } catch (err) {
          logger.warn('[uploadService] dataURLToArrayBuffer failed, falling back to fetch', err);
          const res = await fetch(data);
          const blob = await res.blob();
          buffer = await blob.arrayBuffer();
        }
        body = new Uint8Array(buffer);
    }

    let safeFileName = fileName.replace('public/', '');
    if (safeFileName.startsWith('temp-')) {
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
      safeFileName = `upload_${timestamp}_${Math.random().toString(36).substring(7)}.${ext}`;
    }

    const presignRes = await api['upload-presign'].$post({
      json: { 
        photoId: photoId, 
        fileKey: safeFileName, 
        contentType: mimeType, 
        imageHash: isMain ? imageHash : undefined,
        force: force
      }
    });
    
    if (presignRes.status === 409) {
        const result = await presignRes.json() as { existingUrl?: string };
        return `DUPLICATE:${result.existingUrl || ''}`;
    }

    if (!presignRes.ok) {
      throw ErrorFactory.fatal(`獲取預簽名上傳地址失敗 (HTTP ${presignRes.status})`, { context: 'uploadFile' });
    }

    const result = await presignRes.json() as { 
      success: boolean; 
      error?: string; 
      data?: { uploadUrl: string; publicUrl: string } 
    };
    if (!result.success) throw ErrorFactory.fatal(`上傳伺服器錯誤: ${String(result.error)}`, { context: 'uploadFile' });
    if (!result.data) throw ErrorFactory.fatal('上傳失敗: 接口未返回數據', { context: 'uploadFile' });
    
    const { uploadUrl, publicUrl } = result.data;

    try {
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: body
      });
      if (!uploadRes.ok) {
         throw ErrorFactory.fatal(`雲端存儲上傳失敗 (HTTP ${uploadRes.status})`, { context: 'uploadFile' });
      }
      if (isMain && onProgress) onProgress(100);
      return publicUrl;
    } catch (browserUploadErr) {
      logger.warn('[Upload] Browser direct upload failed', browserUploadErr);
      throw ErrorFactory.fatal(`雲端存儲上傳失敗`, { context: 'uploadFile', cause: browserUploadErr });
    }
  };

  const imageUrlResult = await uploadFile(dataToUpload, `public/${photoId}.${ext}`, true);
  
  if (imageUrlResult.startsWith('DUPLICATE:')) {
     return { imageUrl: imageUrlResult.replace('DUPLICATE:', ''), isDuplicate: true };
  }

  return { imageUrl: imageUrlResult };
};
