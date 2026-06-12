export interface MutationConfig<TData, TVars, TQueryKey = any[]> {
  service: (vars: TVars) => Promise<any>
  invalidate?: TQueryKey[] | ((data: TData, vars: TVars) => TQueryKey[])
  optimistic?: ((old: any, vars: TVars) => any) | {
    type: 'infinite',
    update: (old: any, vars: TVars) => any
  }
  successMessage?: string
  errorMessage?: string
}
