import { compressImage } from '../services/storageService';
import { calculateMD5FromFile, calculateMD5FromArrayBuffer } from '../services/utils';
import { IMAGE_COMPRESS } from '../constants/config';
import { generateThumbHash } from './thumbHash';

export interface ProcessedImage {
  hash: string;
  dataUrl: string;
  file: File;
  thumbHash?: string;
}

/**
 * Utility to process a raw File: calculate hash and compress to WebP Base64
 */
export async function processImageFile(file: File): Promise<ProcessedImage> {
  // 1. Calculate MD5 Hash (for duplicate detection and storage ID)
  let hash: string;
  try {
    hash = await calculateMD5FromFile(file);
  } catch (e) {
    const arrayBuffer = await file.arrayBuffer();
    hash = calculateMD5FromArrayBuffer(arrayBuffer);
  }

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
