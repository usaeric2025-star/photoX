import { useMutation, useQueryClient, QueryKey, QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { hapticFeedback } from '@/lib/ui/haptics';

import { ErrorFactory } from '@/lib/error/ErrorFactory';

interface MutationConfig<TData, TVariables, TContext> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  
  // ✅ 强制使用 readonly tuple，不接受 unknown[]
  queryKey?: readonly unknown[] | ((variables: TVariables) => readonly unknown[]);
  
  // ✅ 声明式失效配置 (P0 核心特性)
  invalidateKeys?: QueryKey[] | ((variables: TVariables, data: TData) => QueryKey[]);
  
  // ✅ 兼容性别名
  getInvalidateKeys?: (data: TData, variables: TVariables) => QueryKey[];
  
  // ✅ 优化：乐观更新函数
  optimisticUpdate?: (oldData: TData | undefined, variables: TVariables) => TData;
  
  // 既有配置
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables, context?: TContext) => void;
  onErrorSideEffect?: (error: Error, variables: TVariables) => void;
  
  entity?: string;
  action?: string;
  errorTitle?: string;
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  errorMessage?: string;
  onSuccessMessage?: string | ((data: TData, variables: TVariables) => string);
}

export function createMutation<TData, TVariables, TContext = unknown>(config: MutationConfig<TData, TVariables, TContext>) {
  return function useStandardMutation(options?: any) {
    const queryClient = useQueryClient();

    const getQueryKey = (variables: TVariables) => {
        if (typeof config.queryKey === 'function') {
           return (config.queryKey as any)(variables);
        }
        return config.queryKey || ['unknown'];
    };
    
    return useMutation({
        mutationFn: async (vars: TVariables): Promise<TData> => {
            try {
              return await config.mutationFn(vars)
            } catch (error) {
              let traceId: string | undefined
      
              // ✅ 兼容 Supabase PostgrestError + 標準 fetch Response
              if (error && typeof error === 'object') {
                const resp = (error as any).response ?? (error as any).details?.response
                traceId = resp?.headers?.get('X-Trace-Id') 
                  ?? resp?.headers?.get('x-trace-id')
                  ?? (error as any).traceId
              }
      
              if (traceId && error instanceof Error) {
                ;(error as any).traceId = traceId
              }
      
              throw error
            }
          },
        onMutate: async (variables: TVariables) => {
          const startTime = performance.now();
          const queryKey = getQueryKey(variables);
          
          // Fire and forget cancellation
          if (queryKey[0] !== 'unknown') {
            queryClient.cancelQueries({ queryKey });
          }
          
          let previousData: any = undefined;
          
          if (config.optimisticUpdate) {
              // For root keys like ['photos'], we need to update all matching query instances (like infinite lists)
              const queriesData = queryClient.getQueriesData({ queryKey });
              if (queriesData.length > 0) {
                previousData = queriesData; 
                queriesData.forEach(([key, oldData]) => {
                  const newData = config.optimisticUpdate!(oldData as any, variables);
                  if (newData !== undefined) {
                    queryClient.setQueryData(key, newData);
                  }
                });
              } else {
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
          const isRollbackFailure = !context?.previousData && config.optimisticUpdate;
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

          // ✅ 自动绑定错误处理 [ERROR-BINDING]
          const actionName = config.errorTitle || (config.entity && config.action ? `${config.entity}:${config.action}` : config.action) || '操作失败';
          ErrorFactory.handle(error, actionName);

          if (isRollbackFailure) {
              toast.error('数据可能不一致，请重新整理页面', { duration: 10000 });
          }
          
          config.onErrorSideEffect?.(error, variables);
          config.onError?.(error, variables, context);
        },
        onSuccess: (data: TData, variables: TVariables, context: any) => {
          hapticFeedback.success();
          const duration = performance.now() - (context?.startTime || 0);
          if (duration > 1500) {
            console.warn(`[Slow Mutation] ${config.entity}:${config.action} took ${duration.toFixed(0)}ms`);
          }
          
          // ✅ 声明式失效规则 [DECLARATIVE-INVALIDATION]
          const keysToInvalidate: QueryKey[] = [];
          
          if (config.invalidateKeys) {
            const keys = typeof config.invalidateKeys === 'function' 
              ? config.invalidateKeys(variables, data) 
              : config.invalidateKeys;
            keysToInvalidate.push(...keys);
          }
          
          if (config.getInvalidateKeys) {
            keysToInvalidate.push(...config.getInvalidateKeys(data, variables));
          }

          if (keysToInvalidate.length > 0) {
            keysToInvalidate.forEach(key => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          } else {
            // Fallback to tracking key if no explicit invalidation keys
            const queryKey = getQueryKey(variables);
            if (queryKey[0] !== 'unknown') {
              queryClient.invalidateQueries({ queryKey });
            }
          }

          config.onSuccess?.(data, variables);
        },
        ...options
    });
  }
}

export function createMutationHook<TData = any, TVariables = any, TContext = unknown>(config: any) {
  return function useStandardMutation(options?: any) {
    const mutation = createMutation<TData, TVariables, TContext>({
      ...config,
      // If queryKey is missing, we pick the first invalidation key as the tracking key
      queryKey: config.queryKey || (typeof config.invalidateKeys === 'function' 
        ? (vars: any) => config.invalidateKeys(vars, null as any)[0] 
        : config.invalidateKeys?.[0]) || ['unknown'],
      onSuccess: (data: TData, variables: TVariables) => {
        // Handle Success Message
        const rawMsg = options?.successMessage ?? config.successMessage ?? config.onSuccessMessage;
        if (rawMsg) {
          const resolvedMsg = typeof rawMsg === 'function' ? rawMsg(data, variables) : rawMsg;
          if (resolvedMsg) toast.success(resolvedMsg);
        }
        
        config.onSuccess?.(data, variables);
      },
      ...options
    });
    
    const mut = mutation(options);
    
    return {
      ...mut,
      execute: (variables: TVariables) => mut.mutateAsync(variables as any)
    };
  };
}

/**
 * 樂觀更新 DSL 操作符 (Optimistic Update DSL)
 * 減少重複的數據結構處理逻辑
 */
export const optimistic = {
  /** 单列表操作 (Array) */
  list: {
    remove: <T>(idField: keyof T = 'id' as any) => (old: T[] | undefined, id: any) => {
      return (old || []).filter((item: any) => item[idField] !== id);
    },
    update: <T>(idField: keyof T = 'id' as any) => (old: T[] | undefined, { id, updates }: { id: any; updates: Partial<T> }) => {
      return (old || []).map((item: any) => item[idField] === id ? { ...item, ...updates } : item);
    },
    add: <T>() => (old: T[] | undefined, newItem: T) => {
      return [...(old || []), newItem];
    },
  },
  /** 无限滚动分页结构 (InfiniteData) */
  infinite: {
    remove: <T>(idField: keyof T = 'id' as any) => (old: any, ids: any | any[]) => {
      if (!old || !old.pages) return old;
      const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          photos: page.photos?.filter((p: any) => !idSet.has(p[idField])) || page.items?.filter((p: any) => !idSet.has(p[idField])),
        })),
      };
    },
    update: <T>(idField: keyof T = 'id' as any) => (old: any, { id, updates }: { id: any; updates: Partial<T> }) => {
      if (!old || !old.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          photos: page.photos?.map((p: any) => p[idField] === id ? { ...p, ...updates } : p) || page.items?.map((p: any) => p[idField] === id ? { ...p, ...updates } : p),
        })),
      };
    },
    add: <T>() => (old: any, item: T) => {
      if (!old || !old.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any, index: number) => 
          index === 0 ? { ...page, photos: [item, ...(page.photos || [])], items: [item, ...(page.items || [])] } : page
        ),
      };
    },
    batchUpdate: <T>(idField: keyof T = 'id' as any) => (old: any, { ids, updates }: { ids: any[]; updates: Partial<T> }) => {
      if (!old || !old.pages) return old;
      const idSet = new Set(ids);
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          photos: page.photos?.map((p: any) => idSet.has(p[idField]) ? { ...p, ...updates } : p) || page.items?.map((p: any) => idSet.has(p[idField]) ? { ...p, ...updates } : p),
        })),
      };
    }
  }
};


