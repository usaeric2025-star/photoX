import { toast } from 'sonner';
import { useErrorHandler, globalHandleError } from './errorHandler';

export const withFeedback = async <T>(
  action: () => Promise<T>,
  successMsg: string,
  errorContext?: string,
  handleError?: (error: unknown, context: string) => void
): Promise<T | undefined> => {
  try {
    const result = await action();
    toast.success(successMsg);
    return result;
  } catch (error) {
    if (handleError && errorContext) {
      handleError(error, errorContext);
    } else {
      globalHandleError(error, errorContext || '操作失败');
    }
    throw error;
  }
};
