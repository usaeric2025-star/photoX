import type { BaseSchema } from 'valibot';

export interface MutationConfig<TData, TVars, TQueryKey extends readonly unknown[] = readonly unknown[]> {
  name: string
  service: (vars: TVars) => Promise<TData>
  invalidate?: TQueryKey | TQueryKey[] | ((data: TData, vars: TVars) => TQueryKey | TQueryKey[])
  /**
   * Optimistic update function. 
   * NOTE: According to Architecture Redlines, every optimistic mutation MUST have rollback testing.
   */
  optimistic?: ((old: unknown, vars: TVars, queryKey?: readonly unknown[]) => unknown)
  successMessage?: string
  errorMessage?: string
  onError?: (error: unknown, vars: TVars) => boolean | void
  cleanupKey?: (vars: TVars) => string
  onSettled?: (data: TData | undefined, error: Error | null, vars: TVars) => void
  schema?: BaseSchema<any, any, any> // Optional Valibot schema to validate previous cache data/next state during optimistic update
  variablesSchema?: BaseSchema<any, TVars, any> // Optional Valibot schema to validate input variables prior to executing the mutation
}

