import { useCallback, useState, useEffect, useRef } from 'react';
import { processPhotos as processPhotosSync } from '../lib/filters';
import type { Photo, Category, Tag } from '../types';
import { logger } from '../lib/logger';

export interface PhotoProcessResult {
  displayPhotos: Photo[];
  gridPhotos: any[];
}

/**
 * Hook to use the Photo Processor Web Worker.
 * Offloads heavy processing to a background thread to prevent UI jank.
 * Includes a synchronous fallback if the worker fails.
 */
export const useProcessedPhotos = () => {
  const workerRef = useRef<Worker | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [workerResult, setWorkerResult] = useState<PhotoProcessResult | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  
  const [syncResult, setSyncResult] = useState<any>(null);
  const [isUsingWorker, setIsUsingWorker] = useState(true);

  // Initialize Worker
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/photoProcessor.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent<{ success: boolean; data?: PhotoProcessResult; error?: string }>) => {
      setIsProcessing(false);
      if (e.data.success) {
        setWorkerResult(e.data.data || null);
        setWorkerError(null);
      } else {
        logger.error('[PhotoProcessorWorker] Error:', e.data.error);
        setWorkerError(e.data.error || 'Unknown worker error');
      }
    };

    worker.onerror = (err) => {
      logger.error('[PhotoProcessorWorker] Critical Error:', err);
      setIsProcessing(false);
      setWorkerError('Worker critical failure');
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const process = useCallback((
    photos: Photo[],
    categories: Category[],
    tags: Tag[],
    userFilters: any,
    urlFilters: any,
    options?: any
  ) => {
    // If worker had a critical error, or is disabled, just run sync
    if (workerError || !workerRef.current || !isUsingWorker) {
      if (isUsingWorker) {
         logger.warn('[PhotoProcessor] Worker not available/failed, using sync fallback');
         setIsUsingWorker(false);
      }
      setIsProcessing(true);
      
      // Execute sync fallback in a timeout to let UI update loading state
      const res = processPhotosSync(photos, categories, tags, userFilters, urlFilters, options);
      setSyncResult(res);
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    try {
      workerRef.current.postMessage({
        photos,
        categories,
        tags,
        userFilters,
        urlFilters,
        options
      });
    } catch (e) {
      logger.error('[PhotoProcessor] postMessage failed (DataCloneError?), falling back to sync', e);
      setIsUsingWorker(false);
      const res = processPhotosSync(photos, categories, tags, userFilters, urlFilters, options);
      setSyncResult(res);
      setIsProcessing(false);
    }
  }, [workerError, isUsingWorker]);

  // If worker error occurs, switch to sync mode for subsequent calls
  useEffect(() => {
    if (workerError) {
      setIsUsingWorker(false);
    }
  }, [workerError]);

  const finalResult = isUsingWorker ? workerResult : syncResult;

  return {
    process,
    result: finalResult,
    isProcessing,
    isFallback: !isUsingWorker
  };
};
