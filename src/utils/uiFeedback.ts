import { toast } from 'sonner';

export const withFeedback = async <T>(
  action: () => Promise<T>,
  successMsg: string
): Promise<T | undefined> => {
  try {
    const result = await action();
    toast.success(successMsg);
    return result;
  } catch (error) {
    // Re-throw so that handleError in logic calls can catch it
    throw error;
  }
};
