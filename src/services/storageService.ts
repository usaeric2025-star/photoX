import { supabase } from '../lib/supabase';
import { DB_CONFIG } from '../constants/config';
import { STORAGE_BUCKET, STORAGE_PATH, R2_PUBLIC_URL } from '../config/constants';

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
  onStatus?: (status: 'compressing' | 'uploading' | 'done') => void,
  onProgress?: (percent: number) => void,
  force = false
): Promise<{imageUrl: string, thumbUrl: string}> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('No active session for storage');
  }

  try {
    // Generate versions with compression
    onStatus?.('compressing');
    const originalBase64 = await compressImage(base64Data, 1200, 0.8);
    let thumbBase64: string;
    try {
        thumbBase64 = await compressImage(base64Data, 300, 0.5);
    } catch (e: unknown) {
        if ((e as Error).name === 'QuotaExceededError') {
             thumbBase64 = originalBase64;
        } else {
             throw e;
        }
    }

    onStatus?.('uploading');
    const uploadFile = async (base64: string, fileName: string, isMain=false) => {
      // 1. Check if file already exists in storage
      // [Deprecated] Supabase Logic:
      /*
      const { data: existingFile } = await supabase.storage
        .from(DB_CONFIG.BUCKET_NAME)
        .list(fileName.split('/')[0], {
          search: fileName.split('/')[1]
        });
      
      const fileExists = existingFile && existingFile.length > 0;
      
      if (!fileExists || force) {
        const res = await fetch(base64);
        const blob = await res.blob();
        
        const { error: storageError } = await supabase.storage
          .from(DB_CONFIG.BUCKET_NAME)
          .upload(fileName, blob, {
            contentType: 'image/webp',
            upsert: true,
            // @ts-ignore
            onUploadProgress: (progress: any) => {
              if (isMain && onProgress) {
                const percent = (progress.loaded / progress.total) * 100;
                onProgress(percent);
              }
            }
          } as any);

        if (storageError) throw storageError;

        if (isMain && onProgress) onProgress(100);
      } else {
        if (isMain && onProgress) onProgress(100);
      }

      const { data: { publicUrl } } = supabase.storage
        .from(DB_CONFIG.BUCKET_NAME)
        .getPublicUrl(fileName);
      
      return publicUrl;
      */

      // [New] Cloudflare R2 S3 API Logic via Presigned URL
      const res = await fetch(base64);
      const blob = await res.blob();
      const buffer = await blob.arrayBuffer();

      const objectKey = `${STORAGE_PATH}/${fileName.replace('public/', '')}`;

      // Get presigned URL from backend
      const presignRes = await fetch('/api/storage/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: objectKey, contentType: 'image/webp' })
      });

      if (!presignRes.ok) {
        throw new Error('Failed to get presigned upload URL from backend');
      }

      const { uploadUrl } = await presignRes.json();

      // Upload directly to R2 using the presigned URL
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/webp' },
        body: new Uint8Array(buffer)
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload to R2 failed: ${uploadRes.statusText}`);
      }

      if (isMain && onProgress) onProgress(100);
      
      return `${R2_PUBLIC_URL}/${objectKey}`;
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
