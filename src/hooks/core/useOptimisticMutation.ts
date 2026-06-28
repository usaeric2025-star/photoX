import { useSWRConfig } from 'swr';
import { useCallback } from 'react';

export function useOptimisticMutation<TData, TVariables>(
  swrKey: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onOptimisticUpdate?: (variables: TVariables, oldData: any) => any;
    onError?: (error: any, variables: TVariables, oldData: any) => void;
    onSuccess?: (data: TData, variables: TVariables) => void;
  }
) {
  const { mutate } = useSWRConfig();

  const trigger = useCallback(
    async (variables: TVariables) => {
      // 1. Get current data (without revalidation)
      const previousData = mutate(swrKey, undefined, { revalidate: false });

      // 2. Optimistic Update
      let optimisticData;
      if (options?.onOptimisticUpdate) {
        optimisticData = options.onOptimisticUpdate(variables, previousData);
        mutate(swrKey, optimisticData, { revalidate: false });
      }

      try {
        // 3. Perform mutation
        const data = await mutationFn(variables);

        if (options?.onSuccess) {
          options.onSuccess(data, variables);
        }

        // 4. Update with actual data
        mutate(swrKey, data, { revalidate: true });
        return data;
      } catch (error) {
        // 5. Rollback on error
        if (options?.onError) {
          options.onError(error, variables, previousData);
        } else {
          mutate(swrKey, previousData, { revalidate: false });
        }
        throw error;
      }
    },
    [mutate, swrKey, mutationFn, options]
  );

  return { trigger };
}
