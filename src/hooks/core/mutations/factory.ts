import { useMutation, useQueryClient, UseMutationOptions, QueryKey, QueryClient } from '@tanstack/react-query';
import { useErrorHandler } from '@/hooks';
import { toast } from '@/lib/ui/toast';
import { useTaskExecutor } from '@/hooks/core/infra/useTaskExecutor';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

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

// Utility for automatic error reporting
function reportErrorToSystem(error: any, action: string, level: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    const normalized = ErrorFactory.normalizeError(error);
      
    const payload = JSON.stringify({
        level,
        message: normalized.message,
        stack: normalized.stack || error?.stack,
        context: action
    });
    
    // Use navigator.sendBeacon for fast, reliable reporting
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/log/event', new Blob([payload], {type: 'application/json'}));
    }
    
    if (level === 'critical') {
        toast.error('严重错误：部分操作数据未同步，已上报至系统后台');
    }
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
    const { handleError } = useErrorHandler();
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
          const actualData = (data && typeof data === 'object' && 'ok' in data && 'data' in data) 
            ? (data as any).data 
            : data;
          
          const msg = typeof config.onSuccessMessage === 'function' 
            ? config.onSuccessMessage(actualData, variables) 
            : config.onSuccessMessage;
          toast.success(msg, { duration: 2000 });
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

        // --- 核心：闭环报告 ---
        const actionName = `${config.entity}${config.action}`;
        let level: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        const prevData = (context as any)?.previousData;
        
        if (context && prevData) {
           level = 'high';
        } else {
           level = 'critical';
           toast.error('资料可能不一致，请重新整理页面', {
             duration: Infinity,
           });
        }
        
        reportErrorToSystem(err, actionName, level);

        // Handle feedback
        handleError(err, actionName, false);

        // Custom error callback
        if (options?.onError) {
          (options.onError as any)(err, variables, context);
        }
      },
      ...options,
    });

    const execute = async (variables: TVariables) => {
      const taskName = `${config.entity}${config.action}`;
      const isLongTask = config.entity === 'Photo' && (config.action === 'Upload' || config.action === 'Analysis' || config.action === 'Delete' || config.action === 'BatchUpdate');
      return await runTask(taskName, () => mutation.mutateAsync(variables), { rethrow: true, showProgress: isLongTask });
    };

    return {
      ...mutation,
      execute,
    };
  };
}
