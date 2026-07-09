import { api } from '#lib/api.js';
import { logger } from '#lib/logger.js';

const UPLOAD_RETRY_COUNT = 2;

/**
 * Upload a blob to R2 via presigned URL
 * Returns the public URL of the uploaded file
 */
export async function uploadToR2(file: Blob, photoId: string, imageHash?: string): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= UPLOAD_RETRY_COUNT; attempt++) {
    try {
      // 1. Get presigned URL
      const presignRes = await api.storage['upload-presign'].$post({
        json: { 
          photoId, 
          imageHash,
          contentType: file.type || 'image/webp'
        }
      });

      if (!presignRes.ok) {
        if (presignRes.status === 409) {
          const data = await presignRes.json() as any;
          return data.existingUrl; // Already exists, return existing URL
        }
        throw new Error(`Presign failed: ${presignRes.status}`);
      }
      
      const { data: { uploadUrl, publicUrl } } = await presignRes.json() as any;

      // 2. Perform PUT upload
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'image/webp' }
      });

      if (uploadRes.ok) return publicUrl;
      
      throw new Error(`Upload failed: ${uploadRes.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(`[Storage] Upload attempt ${attempt + 1} failed:`, lastError.message);
      
      if (attempt < UPLOAD_RETRY_COUNT) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Upload failed after retries');
}
