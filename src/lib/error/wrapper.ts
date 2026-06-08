import { errorFactory, success, ErrorFactory, ErrorSeverity } from '@/lib/error/ErrorFactory';
import type { AppResult } from '@/types/api';

export const withErrorHandling = async <T>(
  fn: () => Promise<T | AppResult<T>>,
  context: string,
  severity: ErrorSeverity = 'high'
): Promise<AppResult<T>> => {
  try {
    const result = await fn();
    if (result && typeof result === 'object' && 'ok' in result) {
        return result as AppResult<T>;
    }
    return success(result as T);
  } catch (error: unknown) {
    const normalized = ErrorFactory.normalizeError(error);
    const contextWithSeverity = `[${severity.toUpperCase()}] ${context}`;
    return errorFactory(normalized.message, 'DB_ERROR', contextWithSeverity, error);
  }
};
