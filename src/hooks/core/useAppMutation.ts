import { useOptimisticMutation } from '@/lib/mutations/useOptimisticMutation';
import { MutationConfig } from '@/lib/mutations/types';
import { useAppMutation as baseUseAppMutation } from '@/lib/query';
import { showToast } from '@/lib/ui/toast';

/**
 * 統一 API 變更 Hook
 */
export function useAppMutation<TVariables, TData, TQueryKey extends readonly unknown[] = readonly unknown[]>(
  config: {
    mutationFn: (variables: TVariables) => Promise<TData>,
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
  } | MutationConfig<TData, TVariables, TQueryKey>
) {
  if ('service' in config) {
    // It's a MutationConfig
    return useOptimisticMutation<TData, TVariables, TQueryKey>(config);
  }

  const { mutationFn, successMessage, errorMessage, onSuccess, onError } = config;
  return baseUseAppMutation({
    mutationFn,
    onSuccess: (data: TData, variables: TVariables) => {
      if (successMessage) showToast.success(successMessage);
      onSuccess?.(data, variables);
    },
    onError: (error: Error, variables: TVariables) => {
      if (errorMessage) {
        showToast.error(errorMessage);
      } else {
        const msg = ('userMessage' in error) ? (error as { userMessage: string }).userMessage : error.message;
        showToast.error(msg);
      }
      onError?.(error, variables);
    },
  });
}
