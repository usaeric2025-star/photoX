
import { showToast } from '@/lib/ui/toast';
import { MutationConfig } from './types';
import { logger } from '@/lib/logger';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { storeAccessor } from '@/lib/store';
import * as v from 'valibot';
import { appQuery } from '@/lib/query';
import { useState } from 'react';

// Client-side idempotency cache
const ongoingRequests = new Map<string, Promise<unknown>>();

/**
 * useOptimisticMutation - A wrapper for mutations.
 * Note: Still needs adjustment for true SWR-based optimistic updates,
 * but satisfies immediate build requirements.
 */
export const useOptimisticMutation = <
  TData = unknown, 
  TVariables = unknown, 
  TQueryKey extends readonly unknown[] = readonly unknown[]
>(config: MutationConfig<TData, TVariables, TQueryKey>) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const trigger = async (vars: TVariables) => {
      setLoading(true);
      setError(null);
      try {
        // Input verification with variablesSchema
        if (config.variablesSchema) {
          const check = v.safeParse(config.variablesSchema, vars);
          if (!check.success) {
            const summary = check.issues.map(i => i.message).join(', ');
            throw new Error(`[Mutation Inputs Contract Violated] ${config.name}: ${summary}`);
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
        
        let data: TData;
        try {
          data = await promise as TData;
        } finally {
          ongoingRequests.delete(idempotencyKey);
        }

        if (config.successMessage) showToast.success(config.successMessage);

        const rawInvalidate = typeof config.invalidate === 'function'
          ? config.invalidate(data, vars)
          : config.invalidate ?? [];

        const keys: (readonly unknown[])[] = Array.isArray(rawInvalidate) && rawInvalidate.length > 0 && Array.isArray(rawInvalidate[0])
          ? rawInvalidate as (readonly unknown[])[]
          : [rawInvalidate as readonly unknown[]];

        await Promise.all(keys.map(key => appQuery.mutate(key as any)));
        
        if (config.cleanupKey) {
          const key = typeof config.cleanupKey === 'function' ? config.cleanupKey(vars) : config.cleanupKey;
          storeAccessor.ui.clearProcessing(key);
        }
        config.onSettled?.(data, null, vars);
        return data;

      } catch (err) {
        setError(err as Error);
        const handled = config.onError?.(err as Error, vars);
        if (!handled) {
          const wrappedError = ErrorFactory.wrap(err as Error, config.name);
          logger.error(`[Mutation Failed] ${config.name}:`, wrappedError);
          ErrorFactory.handleError(wrappedError, config.name, false);
        }
        config.onSettled?.(undefined, err as Error, vars);
        throw err;
      } finally {
        setLoading(false);
      }
  };
  
  return { mutate: trigger, mutateAsync: trigger, isMutating: loading, error };
};

