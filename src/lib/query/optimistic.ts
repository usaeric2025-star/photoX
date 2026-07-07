import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { photoKeys } from './index.js';
import { Photo } from '#src/types/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

interface OptimisticPhotoMutationOptions<TVariables, TData> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onMutateOptimistic: (variables: TVariables) => {
    ids: string | string[];
    updater: (photo: Photo) => Photo | null;
  };
  errorContext: string;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
}

/**
 * 專為照片設計的樂觀更新 Hook
 * 會同時更新照片列表 (Infinite Query) 與單張照片詳情
 */
export function useOptimisticPhotoMutation<TVariables = any, TData = any>(
  options: OptimisticPhotoMutationOptions<TVariables, TData>
) {
  const queryClient = useQueryClient();
  const { mutationFn, onMutateOptimistic, errorContext, onSuccess, onSettled } = options;

  return useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      const { ids, updater } = onMutateOptimistic(variables);
      const idArray = Array.isArray(ids) ? ids : [ids];

      // 1. 取消所有照片相關查詢
      await queryClient.cancelQueries({ queryKey: photoKeys.all });

      // 2. 備份舊數據 (列表與詳情)
      const previousLists = queryClient.getQueriesData<InfiniteData<any>>({ queryKey: photoKeys.lists() });
      const previousDetails = idArray.map(id => ({
        id,
        data: queryClient.getQueryData(photoKeys.detail(id))
      }));

      // 3. 執行樂觀更新 - 更新列表
      queryClient.setQueriesData<InfiniteData<{ photos: Photo[], total: number }>>(
        { queryKey: photoKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              photos: page.photos.map(p => idArray.includes(p.id) ? updater(p) : p).filter((p): p is Photo => p !== null)
            }))
          };
        }
      );

      // 4. 執行樂觀更新 - 更新詳情
      idArray.forEach(id => {
        queryClient.setQueryData(photoKeys.detail(id), (old: any) => {
          if (!old) return old;
          return updater(old as Photo);
        });
      });

      return { previousLists, previousDetails };
    },
    onError: (err, variables, context: any) => {
      // 錯誤回滾
      if (context?.previousLists) {
        context.previousLists.forEach(([key, data]: [any, any]) => {
          queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousDetails) {
        context.previousDetails.forEach(({ id, data }: any) => {
          queryClient.setQueryData(photoKeys.detail(id), data);
        });
      }
      ErrorFactory.handle(err, { context: errorContext });
    },
    onSuccess: (data, variables) => {
      if (onSuccess) onSuccess(data, variables);
    },
    onSettled: (data, error, variables) => {
      if (onSettled) onSettled(data, error, variables);
      // 最後確保數據刷新
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
    }
  });
}
