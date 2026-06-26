import { logger } from '@/lib/logger';
import { supabase } from '../../lib/supabase';
import { STORAGE } from './storageConfig';
import { api } from '@/lib/api';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { compressImage, dataURLToArrayBuffer } from './uploadUtils';
import { resolveUploadStrategy } from './uploadStateMachine';

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
): Promise<UploadResult> => {
    let lastError: unknown;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await uploadImages(userId, photoId, base64Data, imageHash, onStatus, onProgress, force);
      } catch (err) {
        lastError = err;
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
  userId: string, 
  photoId: string, 
  base64Data: string,
  imageHash?: string,
  onStatus?: (status: 'compressing' | 'uploading' | 'done') => void,
  onProgress?: (percent: number) => void,
  force = false
): Promise<UploadResult> => {
  const { data: { session } } = await supabase.auth.getSession();
  const isLocalStorageStaff = typeof window !== 'undefined' && 
    !!(localStorage.getItem('photox_ais_mock_auth_passcode') || localStorage.getItem('ais_mock_auth_passcode'));

  if (!session?.user && !isLocalStorageStaff) {
    throw ErrorFactory.permission('No active session for storage');
  }

  onStatus?.('compressing');
  const originalBase64 = await compressImage(base64Data, 2048, 0.85); 

  onStatus?.('uploading');
  const uploadFile = async (base64: string, fileName: string, isMain=false) => {
    let buffer: ArrayBuffer;
    try {
      const parsed = dataURLToArrayBuffer(base64);
      buffer = parsed.buffer;
    } catch (err) {
      logger.warn('[uploadService] dataURLToArrayBuffer failed, falling back to fetch', err);
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
        headers: { 'Content-Type': 'image/webp' },
        body: new Uint8Array(buffer)
      });
      if (!uploadRes.ok) {
         throw ErrorFactory.fatal(`雲端存儲上傳失敗 (HTTP ${uploadRes.status})`, { context: 'uploadFile' });
      }
      if (isMain && onProgress) onProgress(100);
      return publicUrl;
    } catch (browserUploadErr) {
      logger.warn('[Upload] Browser direct upload failed, trying fallback...', browserUploadErr);
      
      const strategy = resolveUploadStrategy(buffer.byteLength, browserUploadErr);
      
      if (strategy.status === 'failed') {
          throw ErrorFactory.fatal(strategy.userMessage || '上傳服務目前不可用', { context: 'uploadFile' });
      }
      
      logger.warn('[Upload] Falling back to server relay...');
      const fallbackRes = await api['upload-direct'].$post({
        json: { base64Data: base64, fileKey: safeFileName, contentType: 'image/webp' }
      });
      if (!fallbackRes.ok) {
         throw ErrorFactory.fatal(`伺服器中轉上傳失敗 (HTTP ${fallbackRes.status})`, { context: 'uploadFile' });
      }
      const fallbackResult = await fallbackRes.json() as { data: { publicUrl: string } };
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
