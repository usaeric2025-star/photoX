import { useCallback } from 'react';
import { toast } from 'sonner';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { globalHandleError } from '@/lib/error/errorHandler';

export const useAppError = () => {
  const handleError = useCallback((error: unknown, operation: string, resource?: string) => {
    const wrapped = ErrorFactory.wrap(error, operation, resource);
    
    // The existing infrastructure handles logging AND fancy TOAST feedback including diag-copy
    globalHandleError(wrapped, operation, false);
    
    return wrapped;
  }, []);
  
  return { handleError };
};
