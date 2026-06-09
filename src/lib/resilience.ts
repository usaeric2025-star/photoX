import { AppResult } from '@/types/api';
import { ok, fail } from './utils/result';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * 通用指数退避重试包裝器
 * 用於處理網絡抖動或瞬時失敗
 */
export async function withRetry<T>(
  task: () => Promise<AppResult<T>>,
  options: RetryOptions = {}
): Promise<AppResult<T>> {
  const { 
    maxRetries = 3, 
    baseDelay = 1000, 
    onRetry 
  } = options;

  let lastError: string = 'Unknown error';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await task();
      if (result.ok) {
        return result;
      }
      
      lastError = result.message;
      
      // 如果是明確的「不應重試」錯誤（如 401, 403, 400），則直接返回
      if (lastError.includes('401') || lastError.includes('403') || lastError.includes('400')) {
        return result;
      }

    } catch (err: any) {
      lastError = err.message || 'Operation failed';
    }

    if (attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt);
      onRetry?.(attempt + 1, lastError);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return fail(`重試 ${maxRetries} 次後失敗: ${lastError}`);
}


