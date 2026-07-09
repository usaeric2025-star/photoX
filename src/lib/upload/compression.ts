import { CompressedResult } from './types.js';
import { logger } from '#lib/logger.js';

const SMALL_FILE_THRESHOLD = 100 * 1024; // 100KB

/**
 * Compress an image using the background Worker
 * Falls back to original if compression fails or times out
 */
export async function compressImage(file: File): Promise<CompressedResult> {
  if (file.size < SMALL_FILE_THRESHOLD) {
    return { blob: file, width: 0, height: 0, fallback: true };
  }

  try {
    const result = await compressWithWorker(file);
    return {
      blob: result.blob,
      width: result.width,
      height: result.height,
      fallback: false
    };
  } catch (error) {
    logger.warn('[Compress] Worker failed, falling back to original', error);
    return { blob: file, width: 0, height: 0, fallback: true };
  }
}

function compressWithWorker(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../../workers/imageCompressor.worker.ts', import.meta.url),
      { type: 'module' }
    );

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('Compression timed out (60s)'));
    }, 60000);

    worker.onmessage = (event) => {
      clearTimeout(timer);
      worker.terminate();
      if (event.data.success) {
        resolve({
          blob: event.data.blob,
          width: event.data.width,
          height: event.data.height
        });
      } else {
        reject(new Error(event.data.error || 'Compression failed'));
      }
    };

    worker.onerror = (error) => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(`Worker error: ${error.message}`));
    };

    worker.postMessage({ 
        id: crypto.randomUUID(),
        file, 
        maxWidthOrHeight: 2048, 
        quality: 0.85 
    });
  });
}
