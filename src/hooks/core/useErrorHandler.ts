import { useCallback } from 'react';
import { globalHandleError } from '@/lib/error/errorHandler';

export const useErrorHandler = () => {
  const handleError = useCallback((error: any, context: string, silent: boolean = false) => {
    globalHandleError(error, context, silent);
  }, []);
  return { handleError };
};
