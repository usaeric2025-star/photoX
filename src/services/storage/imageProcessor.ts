import { IMAGE_COMPRESS } from '@/constants/config';
import { sha256 } from '@/lib/image/hash';

export interface ProcessedImage {
  hash: string;
  dataUrl: string; // Now actually holds objectUrl
  file: File;
  width: number;
  height: number;
}

/**
 * Utility to process a raw File: generate a real hash and get dimensions
 */
export async function processImageFile(file: File): Promise<ProcessedImage> {
  const activeFile = file;

  // 1. Calculate Real Hash based on file content
  const hash = await sha256(activeFile);

  // 2. Create Object URL for preview
  const objectUrl = URL.createObjectURL(activeFile);

  // 3. Get Dimensions
  const dimensions = await new Promise<{width: number, height: number}>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => {
      console.warn(`[ImageProcessor] Failed to load image for dimensions. File: ${activeFile.name}. Proceeding with default dimensions.`);
      resolve({ width: 0, height: 0 }); // Fallback instead of rejecting
    };
    img.src = objectUrl;
  });

  return {
    hash,
    dataUrl: objectUrl, // This is now an objectUrl
    file: activeFile,
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
    const hash = await sha256(file);
    const objectUrl = URL.createObjectURL(file);

    return { file, objectUrl, hash };
  }));

  const CHUNK_SIZE = 2;
  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = loadedFiles.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.all(
      chunk.map(async ({ file, objectUrl, hash }) => {
        const dimensions = await new Promise<{width: number, height: number}>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.width, height: img.height });
          img.onerror = () => {
            console.warn(`[ImageProcessor] Failed to load image for dimensions. File: ${file.name}. Proceeding with default dimensions.`);
            resolve({ width: 0, height: 0 }); // Fallback instead of rejecting
          };
          img.src = objectUrl;
        });

        return {
          hash,
          dataUrl: objectUrl, // Now holds objectUrl
          file,
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
