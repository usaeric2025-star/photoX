import { 
  useMutation, 
  useQueryClient, 
  UseMutationOptions, 
  QueryKey 
} from '@tanstack/react-query';
import { useFeedback } from '@/hooks/shared/useFeedback';
import { useTaskExecutor } from '@/hooks/core/infra/useTaskExecutor';
import { logResult, logError } from '@/utils/errorLogger';

export interface MutationConfig<TData, TVariables, TContext> {
  entity: string;
  action: string;
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateKeys?: QueryKey[];
  onSuccessMessage?: string | ((data: TData, variables: TVariables) => string);
  taskLevel?: 'light' | 'heavy';
}

/**
 * Standardized factory for creation of PhotoX mutation hooks.
 * Automatically handles task execution, loading states, success/error feedback,
 * and cache invalidation.
 */
export function createMutationHook<TData = void, TVariables = void, TContext = unknown>(
  config: MutationConfig<TData, TVariables, TContext>
) {
  const { taskLevel = 'light' } = config;

  return function useStandardMutation(options?: UseMutationOptions<TData, unknown, TVariables, TContext>) {
    const queryClient = useQueryClient();
    const { showSuccess, handleError } = useFeedback();
    const { runTask } = useTaskExecutor();

    const mutation = useMutation<TData, unknown, TVariables, TContext>({
      mutationFn: config.mutationFn,
      onSuccess: (data, variables, context) => {
        // Invalidate caches
        if (config.invalidateKeys) {
          config.invalidateKeys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
        }

        // Show success feedback (only for heavy or explicit message)
        if (config.onSuccessMessage && taskLevel === 'heavy') {
          const msg = typeof config.onSuccessMessage === 'function' 
            ? config.onSuccessMessage(data, variables) 
            : config.onSuccessMessage;
          showSuccess(msg);
        }

        // Audit success log
        logResult({ action: `${config.entity}${config.action}`, component: 'MutationFactory' }, 'success', data);

        // Custom success callback
        if (options?.onSuccess) {
          (options.onSuccess as any)(data, variables, context);
        }
      },
      onError: (err, variables, context) => {
        // Handle global error feedback
        const msg = typeof config.onSuccessMessage === 'function' 
          ? config.onSuccessMessage(err as TData, variables) 
          : config.onSuccessMessage; // Maybe reuse success message as context if needed, but msg here is bad.
        
        handleError(err, `${config.entity}${config.action}`);                
        logError(err, { action: `${config.entity}${config.action}`, component: 'MutationFactory' });

        // Custom error callback
        if (options?.onError) {
          (options.onError as any)(err, variables, context);
        }
      },
      ...options,
    });

    const execute = async (variables: TVariables) => {
      const taskName = `${config.entity}${config.action}`;
      return await runTask(taskName, async () => {
        return await mutation.mutateAsync(variables);
      });
    };

    return {
      ...mutation,
      execute,
    };
  };
}
