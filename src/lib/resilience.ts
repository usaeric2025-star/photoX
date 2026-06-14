import { ErrorFactory } from './error/ErrorFactory';

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
  task: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { 
    maxRetries = 3, 
    baseDelay = 1000, 
    onRetry 
  } = options;

  let lastError: any = new Error('Unknown error');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await task();
    } catch (err: unknown) {
      lastError = err;
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      // 如果是明確的「不應重試」錯誤（如 401, 403, 400），則直接抛出
      if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('400')) {
        if (err instanceof Error && err.name === 'AppError') throw err;
        throw ErrorFactory.fatal(errorMessage);
      }
    }

    if (attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt);
      onRetry?.(attempt + 1, lastError);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  throw ErrorFactory.fatal(`重試 ${maxRetries} 次後失敗: ${msg}`);
}


