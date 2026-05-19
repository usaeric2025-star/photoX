import { useCallback } from 'react';
import { toast } from 'sonner';
import { useErrorHandler } from '../utils/errorHandler';

/**
 * Unified feedback hook for the entire project.
 * Handles both success notifications and error reporting via the unified error system.
 */
export function useFeedback() {
  const { handleError } = useErrorHandler();

  const showSuccess = useCallback((message: string) => {
    toast.success(message);
  }, []);

  const showError = useCallback((error: unknown, context: string) => {
    handleError(error, context);
  }, [handleError]);

  return { showSuccess, showError, handleError };
}
