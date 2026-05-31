import { useCallback } from 'react';
import { toast } from '@/lib/ui/toast';
import { useErrorHandler } from '@/lib/error/errorHandler';

/**
 * Unified feedback hook for the entire project.
 * Handles both success notifications and error reporting via the unified error system.
 */
export function useToast() {
  const { handleError } = useErrorHandler();

  const showSuccess = useCallback((message: string, isHeavy: boolean = false) => {
    console.log(`[PhotoX Success] ${message}`);
    // SILENT SUCCESS RULE (v2.7): Success toast is forbidden for light tasks.
    // Only show for heavy tasks or explicit overrides.
    if (isHeavy) {
      toast.success(message);
    }
  }, []);

  const showError = useCallback((error: unknown, context: string) => {
    handleError(error, context);
  }, [handleError]);

  return { showSuccess, showError, handleError };
}

export const useFeedback = useToast;
