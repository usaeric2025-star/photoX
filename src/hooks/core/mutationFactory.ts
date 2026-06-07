import { useMutation, useQueryClient, QueryKey, QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { hapticFeedback } from '@/lib/ui/haptics';

interface MutationConfig<TData, TVariables, TContext> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  
  // ✅ 强制使用 readonly tuple，不接受 unknown[]
  queryKey: readonly unknown[] | ((variables: TVariables) => readonly unknown[]);
  
  // ✅ 优化：乐观更新函数
  optimisticUpdate?: (oldData: TData | undefined, variables: TVariables) => TData;
  
  // 既有配置
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables, context?: TContext) => void;
  entity?: string;
  action?: string;
  errorTitle?: string;
  successMessage?: string;
  errorMessage?: string;
}

export function createMutation<TData, TVariables, TContext = unknown>(config: MutationConfig<TData, TVariables, TContext>) {
  return function useStandardMutation(options?: any) {
    const queryClient = useQueryClient();

    const getQueryKey = (variables: TVariables) => {
        if (typeof config.queryKey === 'function') {
        return (config.queryKey as any)(variables);
        }
        return config.queryKey;
    };
    
    return useMutation({
        mutationFn: config.mutationFn,
        onMutate: async (variables: TVariables) => {
        const startTime = performance.now();
        const queryKey = getQueryKey(variables);
        // Fire and forget cancellation to avoid blocking the optimistic update
        queryClient.cancelQueries({ queryKey });
        
        let previousData: any = undefined;
        
        if (config.optimisticUpdate) {
            // For root keys like ['photos'], we need to update all matching query instances (like infinite lists)
            const queriesData = queryClient.getQueriesData({ queryKey });
            if (queriesData.length > 0) {
              // Store previous states for rollback
              previousData = queriesData; 
              
              // Apply optimistic update to all matching query states
              queriesData.forEach(([key, oldData]) => {
                const newData = config.optimisticUpdate!(oldData as any, variables);
                if (newData !== undefined) {
                  queryClient.setQueryData(key, newData);
                }
              });
            } else {
              // Fallback for direct exact matches
              previousData = queryClient.getQueryData<TData>(queryKey);
              const newData = config.optimisticUpdate(previousData as any, variables);
              if (newData !== undefined) {
                  queryClient.setQueryData(queryKey, newData);
              }
            }
        }
        return { previousData, queryKey, startTime, isMultiQuery: Array.isArray(previousData) && previousData.length > 0 && Array.isArray(previousData[0]) } as unknown as TContext;
        },
        onError: (error: Error, variables: TVariables, context: any) => {
        hapticFeedback.error();
        if (context?.previousData !== undefined) {
            if (context.isMultiQuery) {
              context.previousData.forEach(([key, oldData]: [QueryKey, any]) => {
                queryClient.setQueryData(key, oldData);
              });
            } else {
              queryClient.setQueryData(context.queryKey, context.previousData);
            }
        }
        const isRollbackFailure = !context?.previousData;
        const duration = performance.now() - (context?.startTime || 0);
        
        const errorPayload = {
            source: 'frontend_mutation',
            level: isRollbackFailure ? 'critical' : 'high',
            title: isRollbackFailure ? 'OPTIMISTIC_ROLLBACK_FAILED' : (config.errorTitle || 'Mutation Failed'),
            message: error instanceof Error ? error.message : String(error),
            context: {
            entity: config.entity,
            action: config.action,
            variables,
            duration: duration.toFixed(2),
            hasPreviousData: !!context?.previousData,
            }
        };
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(errorPayload)], { type: 'application/json' });
            navigator.sendBeacon('/api/log/event', blob);
        } else {
            api.log.event.$post({ json: errorPayload as any }).catch(console.error);
        }
        if (isRollbackFailure) {
            toast.error('操作失败，数据可能不一致，请重新整理页面', { duration: 10000 });
        } else {
            toast.error(config.errorMessage || '操作失败，已回滚');
        }
        config.onError?.(error, variables, context);
        },
        onSuccess: (data: TData, variables: TVariables, context: any) => {
          hapticFeedback.success();
          const duration = performance.now() - (context?.startTime || 0);
          if (duration > 1500) {
            console.warn(`[Slow Mutation] ${config.entity}:${config.action} took ${duration.toFixed(0)}ms`);
          }
          config.onSuccess?.(data, variables);
        },
        onSettled: (data: TData | undefined, error: Error | null, variables: TVariables) => {
        const queryKey = getQueryKey(variables);
        queryClient.invalidateQueries({ queryKey, refetchType: 'all' });
        },
        ...options
    });
  }
}

export function createMutationHook<TData = any, TVariables = any, TContext = unknown>(config: any) {
  return function useStandardMutation(options?: any) {
    const queryClient = useQueryClient();
    const mutation = createMutation<TData, TVariables, TContext>({
      mutationFn: config.mutationFn,
      queryKey: config.queryKey || config.invalidateKeys?.[0] || ['unknown'],
      optimisticUpdate: config.optimisticUpdate,
      onSuccess: (data, variables) => {
        if (config.invalidateKeys) {
          config.invalidateKeys.forEach((key: any) => queryClient.invalidateQueries({ queryKey: key, refetchType: 'all' }));
        }
        
        // Priority: Runtime options > Config successMessage > Config onSuccessMessage
        // If explicitly set to null/empty string at runtime, we skip the toast.
        const runtimeMsg = options?.successMessage !== undefined ? options.successMessage : undefined;
        const msg = runtimeMsg !== undefined ? runtimeMsg : (config.successMessage || config.onSuccessMessage);
        
        if (msg) {
          const resolvedMsg = typeof msg === 'function' ? msg(data, variables) : msg;
          if (resolvedMsg) {
            toast.success(resolvedMsg);
          }
        }
        
        config.onSuccess?.(data, variables);
      },
      onError: config.onError,
      entity: config.entity,
      action: config.action,
      errorTitle: config.errorTitle,
      successMessage: config.successMessage || config.onSuccessMessage,
      errorMessage: config.errorMessage,
      ...options
    });
    
    // createMutation already handles onMutate, onError, onSettled internally!
    // The previous implementation was redundant and potentially blocking.
    const mut = mutation(options);
    
    return {
      ...mut,
      execute: (variables: TVariables) => mut.mutateAsync(variables as any)
    };
  };
}


