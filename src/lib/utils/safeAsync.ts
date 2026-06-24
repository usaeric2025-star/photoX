import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { logger } from '@/lib/logger';

/**
 * 集中處理非同步異常的包裝器
 * 優點：
 * 1. 統一捕獲未處理的 Promise 異常
 * 2. 自動過濾雜音 (Noise filtering)
 * 3. 確保報錯一致性 (ErrorFactory 轉換)
 */
export async function safeAsync<T>(
  promise: Promise<T> | (() => Promise<T>),
  options: {
    context?: string;
    silent?: boolean;
    onFinally?: () => void;
    rethrow?: boolean;
  } = {}
): Promise<T | null> {
  const { context = 'Operation', silent = false, onFinally, rethrow = false } = options;
  
  try {
    const result = typeof promise === 'function' ? await promise() : await promise;
    return result;
  } catch (error) {
    // 1. 雜音過濾
    const message = (error as Error)?.message || String(error);
    const isNoise = /AbortError|cancel|ResizeObserver|offline|websocket/i.test(message);
    
    if (!isNoise) {
      if (!silent) {
        ErrorFactory.handleError(error, context);
      } else {
        logger.warn(`[SafeAsync] Suppressed Error in ${context}:`, error);
      }
    }
    
    if (rethrow) {
      throw ErrorFactory.wrap(error, context);
    }
    return null;
  } finally {
    onFinally?.();
  }
}
