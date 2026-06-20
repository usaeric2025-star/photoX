import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/ui/toast';
import { MutationConfig } from './types';
import { logger } from '@/lib/logger';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { useUIStore } from '@/store/useUIStore';
import { type } from 'arktype';

// Client-side idempotency cache
const ongoingRequests = new Map<string, Promise<unknown>>();

/**
 * useOptimisticMutation - A wrapper around useMutation that handles optimistic updates and cache management.
 * (Phase 1+2 Upgrade: Enhanced generic inferencing and rollback safety)
 */
export const useOptimisticMutation = <
  TData = unknown, 
  TVariables = unknown, 
  TQueryKey extends readonly unknown[] = readonly unknown[]
>(config: MutationConfig<TData, TVariables, TQueryKey>) => {
  const queryClient = useQueryClient();
  
  return useMutation<TData, Error, TVariables, { previousData: Map<string, unknown> }>({
    mutationFn: async (vars: TVariables) => {
      // Input verification with variablesSchema
      if (config.variablesSchema) {
        const check = config.variablesSchema(vars);
        if (check instanceof type.errors) {
          throw new Error(`[Mutation Inputs Contract Violated] ${config.name}: ${check.summary}`);
        }
      }

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
      const previousData = new Map<string, unknown>();
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
            // P1: Validate existing data (for rollback) against schema if provided to prevent rolling back to or utilizing invalid data
            if (config.schema) {
              const checkPrev = config.schema(data);
              if (checkPrev instanceof type.errors) {
                logger.error(`[Optimistic Rollback Validation Failed] Current cache data for key ${JSON.stringify(queryKey)} violates contract schema:`, checkPrev.summary);
                throw new Error(`[Optimistic Rollback Validation Failed] Cache data violates contract: ${checkPrev.summary}`);
              }
            }

            // Use stringified key to safely store in Map
            previousData.set(JSON.stringify(queryKey), data);
            
            queryClient.setQueryData(queryKey, (old: unknown) => {
              const nextState = updateFn(old, vars, queryKey);
              
              // P1: Validate next state against schema if provided to head-off corrupting cache
              if (config.schema) {
                const checkNext = config.schema(nextState);
                if (checkNext instanceof type.errors) {
                  logger.error(`[Optimistic NextState Validation Failed] Next update state for key ${JSON.stringify(queryKey)} violates contract schema:`, checkNext.summary);
                  throw new Error(`[Optimistic NextState Validation Failed] Next update state violates contract: ${checkNext.summary}`);
                }
              }
              
              return nextState;
            });
          }
        });
      });
      
      return { previousData };
    },
    meta: { suppressGlobalError: true },
    onError: (err, vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach((data: unknown, keyString: string) => {
          const key = JSON.parse(keyString);
          queryClient.setQueryData(key, data);
        });
      }
      
      const handled = config.onError?.(err, vars);
      if (!handled) {
        // P0: Global error logging, automatic ErrorFactory wrapping, and diagnostics UI feedback
        const wrappedError = ErrorFactory.wrap(err, config.name);
        logger.error(`[Optimistic Mutation Failed] ${config.name}:`, wrappedError);
        ErrorFactory.handleError(wrappedError, config.name, false);
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
      if (config.successMessage) showToast.success(config.successMessage);
    },
  });
};

