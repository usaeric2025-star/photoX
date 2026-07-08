import { supabase } from '#lib/supabase.js';
import { STORAGE } from './storageConfig.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { compressImage, dataURLToArrayBuffer } from './uploadUtils.js';

export interface UploadResult {
  imageUrl: string;
  isDuplicate?: boolean;
  imageHash?: string;
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
          ErrorFactory.handle(err, { context: '[Upload] Auth/Permission error occurred. Failing fast without retry.' });
          break;
        }

        if (i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          // Log warn silently or handle differently if needed, but ErrorFactory.handle handles errors.
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
  
  let dataToUpload: File | Blob | string = fileOrBase64;
  let ext = 'webp';
  let mimeType = 'image/webp';
  
  if (typeof fileOrBase64 === 'string') {
      onStatus?.('compressing');
      const res = await fetch(fileOrBase64);
      const blob = await res.blob();
      try {
        dataToUpload = await compressImage(blob, { maxWidth: 2048, quality: 0.85 }); 
        ext = 'webp';
        mimeType = 'image/webp';
      } catch (err) {
        ErrorFactory.handle(err, { context: '[uploadService] compressImage failed for string URL' });
        dataToUpload = blob;
        mimeType = blob.type || 'image/jpeg';
        ext = mimeType.split('/')[1] || 'jpg';
      }
  } else {
      onStatus?.('compressing');
      try {
        dataToUpload = await compressImage(fileOrBase64, { maxWidth: 2048, quality: 0.85 });
        ext = 'webp';
        mimeType = 'image/webp';
      } catch (err) {
        ErrorFactory.handle(err, { context: '[uploadService] compressImage failed for File' });
        dataToUpload = fileOrBase64;
        mimeType = fileOrBase64.type || 'image/jpeg';
        ext = fileOrBase64.name?.split('.').pop()?.toLowerCase() || mimeType.split('/')[1] || 'jpg';
      }
  }

  onStatus?.('uploading');
  const uploadFile = async (data: File | Blob | string, fileName: string, isMain=false) => {
    let body: BodyInit;
    let fallbackBase64 = '';
    
    if (data instanceof File || data instanceof Blob) {
        body = data;
    } else {
        fallbackBase64 = data;
        let buffer: ArrayBuffer;
        try {
          const parsed = dataURLToArrayBuffer(data);
          buffer = parsed.buffer;
        } catch (err) {
          ErrorFactory.handle(err, { context: '[uploadService] dataURLToArrayBuffer failed' });
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

    const presignRes = await api.storage['upload-presign'].$post({
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
      ErrorFactory.handle(browserUploadErr, { context: '[Upload] Browser direct upload failed' });
      throw ErrorFactory.fatal(`雲端存儲上傳失敗`, { context: 'uploadFile', cause: browserUploadErr });
    }
  };

  const imageUrlResult = await uploadFile(dataToUpload, `public/${photoId}.${ext}`, true);
  
  if (imageUrlResult.startsWith('DUPLICATE:')) {
     return { imageUrl: imageUrlResult.replace('DUPLICATE:', ''), isDuplicate: true };
  }

  return { imageUrl: imageUrlResult };
};
