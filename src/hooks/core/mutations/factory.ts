import { useMutation, useQueryClient, QueryKey, QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';

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

export function createMutation<TData, TVariables>(config: MutationConfig<TData, TVariables, unknown>) {
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
        onMutate: async (variables) => {
        const queryKey = getQueryKey(variables);
        await queryClient.cancelQueries({ queryKey });
        const previousData = queryClient.getQueryData<TData>(queryKey);
        if (config.optimisticUpdate) {
            const newData = config.optimisticUpdate(previousData, variables);
            if (newData !== undefined) {
            queryClient.setQueryData(queryKey, newData);
            }
        }
        return { previousData, queryKey };
        },
        onError: (error, variables, context: any) => {
        if (context?.previousData !== undefined) {
            queryClient.setQueryData(context.queryKey, context.previousData);
        }
        const isRollbackFailure = !context?.previousData;
        const errorPayload = {
            source: 'frontend_mutation',
            level: isRollbackFailure ? 'critical' : 'high',
            title: isRollbackFailure ? 'OPTIMISTIC_ROLLBACK_FAILED' : (config.errorTitle || 'Mutation Failed'),
            message: error instanceof Error ? error.message : String(error),
            context: {
            entity: config.entity,
            action: config.action,
            variables,
            hasPreviousData: !!context?.previousData,
            }
        };
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(errorPayload)], { type: 'application/json' });
            navigator.sendBeacon('/api/log/event', blob);
        } else {
            fetch('/api/log/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorPayload),
            keepalive: true
            }).catch(console.error);
        }
        if (isRollbackFailure) {
            toast.error('操作失败，数据可能不一致，请重新整理页面', { duration: 10000 });
        } else {
            toast.error(config.errorMessage || '操作失败，已回滚');
        }
        config.onError?.(error as Error, variables, context);
        },
        onSettled: (data, error, variables) => {
        const queryKey = getQueryKey(variables);
        queryClient.invalidateQueries({ queryKey });
        config.onSuccess?.(data as TData, variables);
        },
        ...options
    });
  }
}

export function createMutationHook<TData = void, TVariables = void, TContext = unknown>(config: any) {
  return function useStandardMutation(options?: any) {
    const mutation = createMutation({
      mutationFn: config.mutationFn,
      queryKey: config.invalidateKeys?.[0],                // Shim
      optimisticUpdate: (oldData: any, variables: any) => oldData, // Shim
      ...options
    })(options);
    
    return {
      ...mutation,
      execute: mutation.mutateAsync
    };
  };
}


