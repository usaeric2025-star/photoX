import { compressImage } from '@/services/storage/uploadUtils';
import { generateThumbHash } from '@/services/storage/thumbHash';
import { IMAGE_COMPRESS } from '@/constants/config';

export interface ProcessedImage {
  hash: string;
  dataUrl: string;
  file: File;
  thumbHash?: string;
  width: number;
  height: number;
}

/**
 * Utility to process a raw File: generate a pseudo hash and compress to WebP Base64
 */
export async function processImageFile(file: File): Promise<ProcessedImage> {
  // 1. Read file as DataURL IMMEDIATELY to prevent iOS temp file deletion
  const rawUri = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (e) => reject(new Error(`文件读取失败 / File read failed: ${reader.error?.message || 'Unknown'}`));
    reader.readAsDataURL(file);
  });

  // 2. Calculate Pseudo Hash based on file metadata
  const pseudoString = `${file.name}|${file.size}|${file.lastModified}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(pseudoString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // 3. Generate ThumbHash
  const thumbHash = await generateThumbHash(rawUri) || undefined;

  // 4. Compress to WebP
  const compressedUri = await compressImage(
    rawUri, 
    IMAGE_COMPRESS.MAX_WIDTH, 
    IMAGE_COMPRESS.QUALITY
  );

  // 5. Get Dimensions
  const dimensions = await new Promise<{width: number, height: number}>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.src = compressedUri;
  });

  return {
    hash,
    dataUrl: compressedUri,
    file,
    thumbHash,
    width: dimensions.width,
    height: dimensions.height
  };
}

/**
 * Process multiple files concurrently
 */
export async function processImageFiles(
  files: File[], 
  onProgress?: (processed: number, total: number) => void
): Promise<ProcessedImage[]> {
  const results: ProcessedImage[] = [];
  const total = files.length;
  
  const loadedFiles = await Promise.all(files.map(async (file) => {
    const rawUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = (e) => reject(new Error(`文件读取失败 / File read failed: ${reader.error?.message || 'Unknown'}`));
      reader.readAsDataURL(file);
    });
    
    const pseudoString = `${file.name}|${file.size}|${file.lastModified}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(pseudoString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return { file, rawUri, hash };
  }));

  const CHUNK_SIZE = 2;
  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = loadedFiles.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.all(
      chunk.map(async ({ file, rawUri, hash }) => {
        const thumbHash = await generateThumbHash(rawUri) || undefined;
        const compressedUri = await compressImage(rawUri, IMAGE_COMPRESS.MAX_WIDTH, IMAGE_COMPRESS.QUALITY);
        
        const dimensions = await new Promise<{width: number, height: number}>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.width, height: img.height });
          img.src = compressedUri;
        });

        return {
          hash,
          dataUrl: compressedUri,
          file,
          thumbHash,
          width: dimensions.width,
          height: dimensions.height
        };
      })
    );
    results.push(...chunkResults);
    if (onProgress) onProgress(Math.min(i + CHUNK_SIZE, total), total);
  }
  
  return results;
}
