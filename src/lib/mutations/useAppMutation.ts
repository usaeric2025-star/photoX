import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MutationConfig } from './types';
import { logger } from '@/lib/logger';
import { handleError } from '@/lib/error/ErrorFactory';
import { useUIStore } from '@/store/useUIStore';

// Client-side idempotency cache
const ongoingRequests = new Map<string, Promise<any>>();

export const defineMutation = <TData, TVars, TQueryKey = any[]>(config: MutationConfig<TData, TVars, TQueryKey>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (vars: TVars) => {
      // Idempotency Key logic
      const varsString = JSON.stringify(vars);
      const idempotencyKey = `${config.name}:${varsString}`;
      
      if (ongoingRequests.has(idempotencyKey)) {
        return ongoingRequests.get(idempotencyKey);
      }
      
      const promise = config.service(vars);
      ongoingRequests.set(idempotencyKey, promise);
      
      try {
        return await promise;
      } finally {
        ongoingRequests.delete(idempotencyKey);
      }
    },
    onMutate: async (vars) => {
      if (!config.optimistic) return;
      
      const queryKeys = typeof config.invalidate === 'function' 
        ? config.invalidate({} as TData, vars) 
        : config.invalidate ?? [];
        
      await Promise.all(queryKeys.map(key => queryClient.cancelQueries({ queryKey: key as any })));
      
      const previousData = new Map();
      
      const updateFn = typeof config.optimistic === 'function'
        ? config.optimistic
        : config.optimistic.update;

      queryKeys.forEach(key => {
        // Get ALL matching queries by this query filter
        const matchingQueries = queryClient.getQueriesData({ queryKey: key as any });
        
        if (matchingQueries.length === 0) {
          logger.warn(`Rollback anchor missing: no matching query for ${JSON.stringify(key)} found, skipping optimistic update.`);
        }

        matchingQueries.forEach(([queryKey, data]) => {
          if (data) {
            previousData.set(queryKey, data);
            queryClient.setQueryData(queryKey, (old: any) => updateFn(old, vars, queryKey));
          }
        });
      });
      
      return { previousData };
    },
    onError: (err, vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach((data: any, key: any) => {
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
    onSettled: (data, err, vars) => {
      const keys = typeof config.invalidate === 'function' 
        ? config.invalidate(data!, vars) 
        : config.invalidate ?? [];
      keys.forEach(key => queryClient.invalidateQueries({ queryKey: key as any }));
      
      if (config.cleanupKey) {
        const key = typeof config.cleanupKey === 'function' 
          ? config.cleanupKey(vars) 
          : config.cleanupKey;
        useUIStore.getState().clearProcessing(key);
      }
      config.onSettled?.(data, err, vars);
    },
    onSuccess: (data, vars) => {
      if (config.successMessage) toast.success(config.successMessage);
    },
  });
};

export const useAppMutation = defineMutation;
