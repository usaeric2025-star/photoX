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
    onSuccess: (...args) => {
      if (options?.successMessage) showToast.success(options.successMessage);
      options?.onSuccess?.(...args);
    },
    onError: (...args) => {
      if (options?.errorMessage) showToast.error(options.errorMessage);
      else if (args[0] instanceof Error) showToast.error(args[0].message);
      else showToast.error(String(args[0]));
      options?.onError?.(...args);
    },
    ...options,
  });
}
