import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MutationConfig } from './types';
import { logger } from '@/lib/logger';
import { handleError } from '@/lib/error/ErrorFactory';
import { useUIStore } from '@/store/useUIStore';

// Client-side idempotency cache
const ongoingRequests = new Map<string, Promise<unknown>>();

export const useAppMutation = <
  TData = unknown, 
  TVariables = unknown, 
  TQueryKey extends readonly unknown[] = readonly unknown[]
>(config: MutationConfig<TData, TVariables, TQueryKey>) => {
  const queryClient = useQueryClient();
  
  return useMutation<TData, Error, TVariables, { previousData: Map<readonly unknown[], unknown> }>({
    mutationFn: async (vars: TVariables) => {
      // Idempotency Key logic
      const varsString = JSON.stringify(vars);
      const idempotencyKey = `${config.name}:${varsString}`;
      
      if (ongoingRequests.has(idempotencyKey)) {
        return ongoingRequests.get(idempotencyKey) as Promise<TData>;
      }
      
      const promise = config.service(vars);
      ongoingRequests.set(idempotencyKey, promise);
      
      try {
        return await promise as TData;
      } finally {
        ongoingRequests.delete(idempotencyKey);
      }
    },
    onMutate: async (vars: TVariables) => {
      const previousData = new Map<readonly unknown[], unknown>();
      if (!config.optimistic) return { previousData };

      const rawInvalidate = typeof config.invalidate === 'function'                
        ? config.invalidate({} as TData, vars)
        : config.invalidate ?? [];
      
      const queryKeys: (readonly unknown[])[] = Array.isArray(rawInvalidate) && rawInvalidate.length > 0 && Array.isArray(rawInvalidate[0]) 
        ? rawInvalidate as (readonly unknown[])[] 
        : [rawInvalidate as readonly unknown[]];
        
      await Promise.all(queryKeys.map(key => queryClient.cancelQueries({ queryKey: key as readonly unknown[] })));
      
      const updateFn = config.optimistic;

      queryKeys.forEach(key => {
        // Get ALL matching queries by this query filter
        const matchingQueries = queryClient.getQueriesData({ queryKey: key as readonly unknown[] });
        
        if (matchingQueries.length === 0) {
          logger.warn(`Rollback anchor missing: no matching query for ${JSON.stringify(key)} found, skipping optimistic update.`);
        }

        matchingQueries.forEach(([queryKey, data]) => {
          if (data) {
            previousData.set(queryKey, data);
            queryClient.setQueryData(queryKey, (old: unknown) => updateFn(old, vars, queryKey));
          }
        });
      });
      
      return { previousData };
    },
    onError: (err, vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach((data: unknown, key: readonly unknown[]) => {
          queryClient.setQueryData(key, data);
        });
      }
      
      const handled = config.onError?.(err, vars);
      if (!handled) {
        // Global error logging and UI feedback
        logger.error(`[Mutation Failed] ${config.name}:`, err);
        handleError(err, config.name);
      }
    },
    onSettled: (data: TData | undefined, err: Error | null, vars: TVariables) => {
      const rawInvalidate = typeof config.invalidate === 'function'
        ? config.invalidate(data!, vars)
        : config.invalidate ?? [];

      const keys: (readonly unknown[])[] = Array.isArray(rawInvalidate) && rawInvalidate.length > 0 && Array.isArray(rawInvalidate[0])
        ? rawInvalidate as (readonly unknown[])[]
        : [rawInvalidate as readonly unknown[]];

      keys.forEach(key => queryClient.invalidateQueries({ queryKey: key as readonly unknown[] }));
      
      if (config.cleanupKey) {
        const key = typeof config.cleanupKey === 'function' ? config.cleanupKey(vars) : config.cleanupKey;
        useUIStore.getState().clearProcessing(key);
      }
      config.onSettled?.(data, err, vars);
    },
    onSuccess: (data: TData, vars: TVariables) => {
      if (config.successMessage) toast.success(config.successMessage);
    },
  });
};
