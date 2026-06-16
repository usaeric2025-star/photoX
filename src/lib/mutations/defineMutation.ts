import { MutationConfig } from './types';

export function defineMutation<
  TData = unknown,
  TVariables = unknown,
  TQueryKey extends readonly unknown[] = readonly unknown[]
>(config: MutationConfig<TData, TVariables, TQueryKey>): MutationConfig<TData, TVariables, TQueryKey> {
  return config;
}
