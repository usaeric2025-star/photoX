import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MutationConfig } from './types';

export const useAppMutation = <TData, TVars, TQueryKey = any[]>(config: MutationConfig<TData, TVars, TQueryKey>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: config.service,
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
        previousData.set(key, queryClient.getQueryData(key as any));
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
      if (config.errorMessage) toast.error(config.errorMessage);
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
