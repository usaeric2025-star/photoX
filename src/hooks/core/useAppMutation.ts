import { useAppMutation as baseUseAppMutation } from '@/lib/query';
import { type UseMutationOptions } from '@tanstack/react-query';
import { showToast } from '@/lib/ui/toast';

/**
 * 統一 API 變更 Hook
 */
export function useAppMutation<TData, TError = Error, TVariables = void, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> & {
    successMessage?: string;
    errorMessage?: string;
  }
) {
  return baseUseAppMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      if (options?.successMessage) showToast.success(options.successMessage);
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (options?.errorMessage) showToast.error(options.errorMessage);
      else if (error instanceof Error) showToast.error(error.message);
      else showToast.error(String(error));
      options?.onError?.(error, variables, context);
    },
    ...options,
  });
}
