
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
            const summary = Array.isArray(check.issues) ? check.issues.map(i => i.message).join(', ') : 'Unknown validation issue';
            throw new Error(`[Mutation Inputs Contract Violated] ${config.name}: ${summary}`);
          }
        }

        // Idempotency Key logic
        const varsString = JSON.stringify(vars);
        const idempotencyKey = `${config.name}:${varsString}`;
        
        if (ongoingRequests.has(idempotencyKey)) {
          return ongoingRequests.get(idempotencyKey) as Promise<TData>;
        }
        
        // --- Optimistic Update Phase ---
        const keysToInvalidate: (readonly unknown[])[] = [];
        const rawInvalidateInit = typeof config.invalidate === 'function' 
            ? config.invalidate({} as TData, vars) // Pass empty object for initial calculation
            : config.invalidate ?? [];
        if (Array.isArray(rawInvalidateInit) && rawInvalidateInit.length > 0) {
           if (Array.isArray(rawInvalidateInit[0])) {
               keysToInvalidate.push(...(rawInvalidateInit as (readonly unknown[])[]));
           } else {
               keysToInvalidate.push(rawInvalidateInit as readonly unknown[]);
           }
        }

        if (config.optimistic) {
            await Promise.all(keysToInvalidate.map(key => 
                appQuery.mutate(key, (oldData: unknown) => {
                    return config.optimistic!(oldData, vars, key);
                }, { revalidate: false })
            ));
        }
        // -------------------------------

        const promise = (async () => {
          try {
            const result = await config.service(vars);
            
            // Re-evaluate invalidate with actual data
            const rawInvalidateFinal = typeof config.invalidate === 'function'
              ? config.invalidate(result, vars)
              : config.invalidate ?? [];
              
            const finalKeys: (readonly unknown[])[] = Array.isArray(rawInvalidateFinal) && rawInvalidateFinal.length > 0 && Array.isArray(rawInvalidateFinal[0])
              ? rawInvalidateFinal as (readonly unknown[])[]
              : [rawInvalidateFinal as readonly unknown[]];

            await Promise.all(finalKeys.map(key => appQuery.mutate(key)));
            return result;
          } catch (err) {
            // Rollback optimistic updates by triggering a revalidation
            if (config.optimistic) {
                await Promise.all(keysToInvalidate.map(key => appQuery.mutate(key)));
            }
            throw err;
          } finally {
            ongoingRequests.delete(idempotencyKey);
          }
        })();

        ongoingRequests.set(idempotencyKey, promise);
        
        let data: TData;
        data = await promise;

        if (config.successMessage) showToast.success(config.successMessage);

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

