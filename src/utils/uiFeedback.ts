import { toast } from 'sonner';
import { useErrorHandler } from './errorHandler';

export const withFeedback = async <T>(
  action: () => Promise<T>,
  successMsg: string,
  errorContext: string
): Promise<T | undefined> => {
  const { handleError } = useErrorHandler();
  try {
    const result = await action();
    toast.success(successMsg);
    return result;
  } catch (error) {
    handleError(error, errorContext);
    throw error;
  }
};
