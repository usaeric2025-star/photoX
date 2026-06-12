import { useCallback, useState } from 'react';
import { processPhotos as processPhotosSync } from '@/services/photo/processing';
import type { Photo, Category, Tag } from '@/types/photo';
import { logger } from '@/lib/logger';

export interface PhotoProcessResult {
  displayPhotos: Photo[];
  gridPhotos: any[];
}

/**
 * Hook to process photos. Modified to run synchronously to avoid production 
 * worker path resolution issues that cause infinite loading states.
 */
export const useProcessedPhotos = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const process = useCallback((
    photos: Photo[],
    categories: Category[],
    tags: Tag[],
    userFilters: any,
    urlFilters: any,
    options?: any
  ) => {
    setIsProcessing(true);
    
    // Execute synchronously
    try {
      const res = processPhotosSync(photos, categories, tags, userFilters, urlFilters, options);
      setSyncResult(res);
    } catch (e) {
      logger.error('[PhotoProcessor] Processing failed:', e);
      setSyncResult({ displayPhotos: [], gridPhotos: [] });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    process,
    result: syncResult,
    isProcessing,
    isFallback: true
  };
};
