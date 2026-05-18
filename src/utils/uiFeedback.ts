import { toast } from 'sonner';
import { useErrorHandler } from './errorHandler';

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
      console.error(errorContext || 'Error in withFeedback:', error);
      toast.error(errorContext ? `操作失败: ${errorContext}` : '操作失败');
    }
    throw error;
  }
};
