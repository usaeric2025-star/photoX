import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MutationConfig } from './types';
import { logger } from '@/lib/logger';
import { handleError } from '@/lib/error/ErrorFactory';

// Client-side idempotency cache
const ongoingRequests = new Map<string, Promise<any>>();

export const useAppMutation = <TData, TVars, TQueryKey = any[]>(config: MutationConfig<TData, TVars, TQueryKey>) => {
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
        // Optimistic Rollback Contract: use getQueryState(key)?.data
        const state = queryClient.getQueryState(key as any);
        if (!state) {
          throw new Error(`Rollback anchor missing: query state for ${JSON.stringify(key)} is undefined`);
        }
        
        previousData.set(key, state.data);
        queryClient.setQueryData(key as any, (old: any) => updateFn(old, vars));
      });
      
      return { previousData };
    },
    onError: (err, vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach((data: any, key: any) => {
          queryClient.setQueryData(key, data);
        });
      }
      
      // Global error logging and UI feedback
      logger.error(`[Mutation Failed] ${config.name}:`, err);
      handleError(err, config.name);
    },
    onSettled: (data, err, vars) => {
      const keys = typeof config.invalidate === 'function' 
        ? config.invalidate(data!, vars) 
        : config.invalidate ?? [];
      keys.forEach(key => queryClient.invalidateQueries({ queryKey: key as any }));
    },
    onSuccess: (data, vars) => {
      if (config.successMessage) toast.success(config.successMessage);
    },
  });
};
