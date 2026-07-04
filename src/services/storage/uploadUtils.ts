import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import imageCompression from 'browser-image-compression';

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export async function compressImage(fileOrBlob: File | Blob, options: CompressOptions = {}): Promise<Blob> {
  try {
    // browser-image-compression expects a File object
    const file = fileOrBlob instanceof File 
      ? fileOrBlob 
      : new File([fileOrBlob], 'image.jpg', { type: fileOrBlob.type || 'image/jpeg' });

    const compressionOptions = {
      maxWidthOrHeight: options.maxWidth || 2048,
      useWebWorker: true,
      initialQuality: options.quality || 0.85,
      alwaysKeepResolution: false,
      fileType: options.format || 'image/webp',
      maxIteration: 10,
    };

    // Fix for CJS default export behavior
    const compressFn = ((imageCompression as unknown as { default?: unknown }).default || imageCompression) as (file: File, options: unknown) => Promise<File>;
    const compressedFile = await compressFn(file, compressionOptions);
    return compressedFile;
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
