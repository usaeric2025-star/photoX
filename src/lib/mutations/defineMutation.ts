import { MutationConfig } from './types';

export const defineMutation = <TData, TVars>(config: MutationConfig<TData, TVars>) => {
  return config;
};
