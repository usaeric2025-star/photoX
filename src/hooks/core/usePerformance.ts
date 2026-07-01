import { useEffect } from 'react';
import { logger } from '#lib/logger';

/**
 * usePerformance hook
 * Tracks component render time and logs it if it exceeds threshold.
 * Used for monitoring heavy components.
 * 
 * @param name Component name for logging
 * @param threshold Threshold in ms (default 10ms)
 */
export function usePerformance(name: string, threshold = 10) {
  const start = performance.now();

  useEffect(() => {
    const end = performance.now();
    const duration = end - start;
    
    if (duration > threshold) {
      logger.debug(`[PERF] ${name} render took ${duration.toFixed(2)}ms`);
    }
  });
}
