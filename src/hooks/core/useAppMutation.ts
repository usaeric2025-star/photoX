import { useAppMutation as baseUseAppMutation } from '@/lib/query';
import { showToast } from '@/lib/ui/toast';

/**
 * 統一 API 變更 Hook
 */
export function useAppMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
  }
) {
  return baseUseAppMutation(mutationFn, {
    onSuccess: (data: TData, variables: TVariables) => {
      if (options?.successMessage) showToast.success(options.successMessage);
      options?.onSuccess?.(data, variables);
    },
    onError: (error: Error, variables: TVariables) => {
      if (options?.errorMessage) showToast.error(options.errorMessage);
      else showToast.error(error.message);
      options?.onError?.(error, variables);
    },
  });
}
