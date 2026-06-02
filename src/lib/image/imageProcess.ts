import { compressImage } from '@/services/storage/uploadService';
import { generateThumbHash } from '@/lib/image/thumbHash';
import { IMAGE_COMPRESS } from '@/constants/config';

export interface ProcessedImage {
  hash: string;
  dataUrl: string;
  file: File;
  thumbHash?: string;
}

/**
 * Utility to process a raw File: generate a pseudo hash and compress to WebP Base64
 */
export async function processImageFile(file: File): Promise<ProcessedImage> {
  // 1. Calculate Pseudo Hash based on file metadata (do not block UI with large file content MD5)
  const pseudoString = `${file.name}|${file.size}|${file.lastModified}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(pseudoString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // 2. Generate ThumbHash
  const thumbHash = await generateThumbHash(file) || undefined;

  // 3. Read file as DataURL for compression
  const rawUri = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = () => reject(new Error('文件读取失败 / File read failed'));
    reader.readAsDataURL(file);
  });

  // 3. Compress to WebP
  const compressedUri = await compressImage(
    rawUri, 
    IMAGE_COMPRESS.MAX_WIDTH, 
    IMAGE_COMPRESS.QUALITY
  );

  return {
    hash,
    dataUrl: compressedUri,
    file
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
  
  // We process in small chunks to avoid blocking the UI thread too much
  const CHUNK_SIZE = 2;
  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = files.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.all(
      chunk.map(file => processImageFile(file))
    );
    results.push(...chunkResults);
    if (onProgress) onProgress(Math.min(i + CHUNK_SIZE, total), total);
  }
  
  return results;
}
