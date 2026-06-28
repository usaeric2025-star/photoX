import { ErrorFactory } from '@/lib/error/ErrorFactory';

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export async function compressImage(fileOrBlob: File | Blob, options: CompressOptions = {}): Promise<Blob> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    try {
      const bitmap = await createImageBitmap(fileOrBlob, {
        resizeWidth: options.maxWidth || 2048,
        resizeQuality: 'high',
      });
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
    } catch (bitmapError) {
      console.warn('createImageBitmap failed, falling back to Image element', bitmapError);
      
      const img = new Image();
      const objectUrl = URL.createObjectURL(fileOrBlob);
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          let width = img.width;
          let height = img.height;
          
          if (options.maxWidth && width > options.maxWidth) {
             height = Math.round((height * options.maxWidth) / width);
             width = options.maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('圖片載入失敗，無法解碼該檔案。'));
        };
        img.src = objectUrl;
      });
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('壓縮失敗'))),
        options.format || 'image/webp',
        options.quality || 0.85
      );
    });

    return blob;
  } catch (error) {
    throw ErrorFactory.wrap(error instanceof Error ? error : new Error(String(error)), 'compressImage');
  }
}

export function dataURLToArrayBuffer(dataurl: string): { buffer: ArrayBuffer; mime: string } {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/webp';
  if (arr.length < 2) {
    throw ErrorFactory.wrap(new Error('Invalid data URL format'), 'dataURLToArrayBuffer');
  }
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return { buffer: u8arr.buffer, mime };
}
