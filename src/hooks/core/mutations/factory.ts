import { useMutation, useQueryClient, UseMutationOptions, QueryKey, QueryClient } from '@tanstack/react-query';
import { useFeedback } from '@/hooks';
import { useTaskExecutor } from '@/hooks/core/infra/useTaskExecutor';

export interface MutationConfig<TData, TVariables, TContext> {
  entity: string;
  action: string;
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateKeys?: QueryKey[];
  onSuccessMessage?: string | ((data: TData, variables: TVariables) => string);
  errorMessage?: string | ((error: unknown, variables: TVariables) => string);
  optimisticUpdate?: (variables: TVariables, queryClient: QueryClient) => Promise<TContext | void>;
  rollback?: (error: unknown, variables: TVariables, context: TContext | undefined, queryClient: QueryClient) => void;
}

/**
 * Standardized factory for creation of PhotoX mutation hooks.
 * Automatically handles task execution, loading states, success/error feedback,
 * and cache invalidation.
 */
export function createMutationHook<TData = void, TVariables = void, TContext = unknown>(
  config: MutationConfig<TData, TVariables, TContext>
) {
  return function useStandardMutation(options?: UseMutationOptions<TData, unknown, TVariables, TContext>) {
    const queryClient = useQueryClient();
    const { showSuccess, handleError } = useFeedback();
    const { runTask } = useTaskExecutor();

    const mutation = useMutation<TData, unknown, TVariables, TContext>({
      mutationFn: config.mutationFn,
      onMutate: async (variables) => {
        if (config.optimisticUpdate) {
          return await config.optimisticUpdate(variables, queryClient) as TContext;
        }
        return undefined as TContext;
      },
      onSuccess: (data, variables, context) => {
        // Invalidate caches
        if (config.invalidateKeys) {
          config.invalidateKeys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
        }

        // Show feedback
        if (config.onSuccessMessage) {
          const msg = typeof config.onSuccessMessage === 'function' 
            ? config.onSuccessMessage(data, variables) 
            : config.onSuccessMessage;
          showSuccess(msg);
        }

        // Custom success callback
        if (options?.onSuccess) {
          (options.onSuccess as any)(data, variables, context);
        }
      },
      onError: (err, variables, context) => {
        // Rollback optimistic update
        if (config.rollback) {
          config.rollback(err, variables, context, queryClient);
        }

        // Handle feedback
        // Note: msg in config is not directly used for toast, extracted from error.
        handleError(err, `${config.entity}${config.action}`, false);

        // Custom error callback
        if (options?.onError) {
          (options.onError as any)(err, variables, context);
        }
      },
      ...options,
    });

    const execute = async (variables: TVariables) => {
      const taskName = `${config.entity}${config.action}`;
      return await runTask(taskName, () => mutation.mutateAsync(variables));
    };

    return {
      ...mutation,
      execute,
    };
  };
}
