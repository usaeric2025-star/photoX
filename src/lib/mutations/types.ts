export interface MutationConfig<TData, TVars, TQueryKey = any[]> {
  name: string
  service: (vars: TVars) => Promise<any>
  invalidate?: TQueryKey[] | ((data: TData, vars: TVars) => TQueryKey[])
  optimistic?: ((old: any, vars: TVars, queryKey?: readonly unknown[]) => any) | {
    type: 'infinite',
    update: (old: any, vars: TVars, queryKey?: readonly unknown[]) => any
  }
  successMessage?: string
  errorMessage?: string
  onError?: (error: any, vars: TVars) => boolean | void
  cleanupKey?: (vars: TVars) => string
  onSettled?: (data: TData | undefined, error: Error | null, vars: TVars) => void
}
